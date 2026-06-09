<?php

/**
 * Martial App — V1 School Import Script
 *
 * Reads an Excel file and imports schools into V1 tables:
 *   users + userdetails + usermeta
 *
 * No V1 schema changes. No new tables.
 *
 * Requirements:
 *   composer require phpoffice/phpspreadsheet
 *
 * Usage:
 *   php v1-school-import.php --file ./schools.xlsx
 *   php v1-school-import.php --file ./schools.xlsx --dry-run
 *   php v1-school-import.php --file ./schools.xlsx --limit 3
 */

require_once __DIR__ . '/../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

// ─── CLI ARGS ────────────────────────────────────────────────────────────────

$opts = getopt('', ['file:', 'dry-run', 'limit:']);

$excelFile = $opts['file'] ?? null;
$dryRun    = isset($opts['dry-run']);
$limit     = isset($opts['limit']) ? (int)$opts['limit'] : null;

if (!$excelFile || !file_exists($excelFile)) {
    echo "Usage: php v1-school-import.php --file ./schools.xlsx [--dry-run] [--limit 3]\n";
    exit(1);
}

// ─── DB CONFIG ───────────────────────────────────────────────────────────────
// Set these or use environment variables / Laravel .env

$dbHost = getenv('V1_DB_HOST') ?: '127.0.0.1';
$dbName = getenv('V1_DB_NAME') ?: 'martial_v1';
$dbUser = getenv('V1_DB_USER') ?: 'root';
$dbPass = getenv('V1_DB_PASS') ?: '';

// ─── CONNECT ─────────────────────────────────────────────────────────────────

if (!$dryRun) {
    try {
        $pdo = new PDO(
            "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4",
            $dbUser,
            $dbPass,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
    } catch (PDOException $e) {
        echo "DB connection failed: " . $e->getMessage() . "\n";
        exit(1);
    }
}

// ─── READ EXCEL ───────────────────────────────────────────────────────────────

echo "\n=== Martial App V1 School Import ===\n";
echo "File:    {$excelFile}\n";
echo "Mode:    " . ($dryRun ? 'DRY RUN (no DB writes)' : 'LIVE') . "\n";
if ($limit) echo "Limit:   {$limit} rows\n";
echo "\n";

$spreadsheet = IOFactory::load($excelFile);
$sheet       = $spreadsheet->getSheetByName('Schools_Input');

if (!$sheet) {
    echo "ERROR: Sheet 'Schools_Input' not found in Excel file.\n";
    exit(1);
}

$rows    = $sheet->toArray(null, true, true, false);
$headers = array_shift($rows); // first row = column names

// Map header names to indexes
$colMap = [];
foreach ($headers as $i => $name) {
    if ($name !== null) $colMap[trim($name)] = $i;
}

function col(array $row, array $colMap, string $key): ?string
{
    if (!isset($colMap[$key])) return null;
    $val = $row[$colMap[$key]] ?? null;
    if ($val === null || $val === '') return null;
    return trim((string)$val);
}

// ─── LOG ──────────────────────────────────────────────────────────────────────

$log     = [];
$logFile = __DIR__ . '/import-log-' . date('Ymd-His') . '.csv';

function logRow(array &$log, int $rowNum, string $name, string $status, string $reason = '', ?int $userId = null, string $dupType = '', string $error = ''): void
{
    $log[] = [$rowNum, $name, $status, $reason, $userId ?? '', $dupType, $error];
    $icon  = match($status) { 'imported' => '✅', 'skipped' => '⏭', 'updated' => '🔄', 'failed' => '❌', default => '·' };
    echo "  Row {$rowNum}: {$icon} {$status} — {$name}" . ($reason ? " ({$reason})" : '') . "\n";
}

// ─── DUPLICATE CHECK ──────────────────────────────────────────────────────────

function findDuplicate(PDO $pdo, array $school): ?array
{
    // 1. google_place_id
    if ($school['google_place_id']) {
        $stmt = $pdo->prepare("SELECT u.id FROM users u JOIN usermeta m ON m.user_id = u.id WHERE m.meta_key = 'google_place_id' AND m.meta_value = ? AND u.user_type = 2 LIMIT 1");
        $stmt->execute([$school['google_place_id']]);
        if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) return ['id' => $row['id'], 'match' => 'google_place_id'];
    }

    // 2. email
    if ($school['email']) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND user_type = 2 LIMIT 1");
        $stmt->execute([$school['email']]);
        if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) return ['id' => $row['id'], 'match' => 'email'];
    }

    // 3. website domain
    if ($school['website']) {
        $domain = preg_replace('#^https?://(www\.)?#', '', rtrim($school['website'], '/'));
        $stmt = $pdo->prepare("SELECT u.id FROM users u JOIN userdetails d ON d.user_id = u.id WHERE d.webiste LIKE ? AND u.user_type = 2 LIMIT 1");
        $stmt->execute(["%{$domain}%"]);
        if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) return ['id' => $row['id'], 'match' => 'website'];
    }

    // 4. phone
    if ($school['phone']) {
        $stmt = $pdo->prepare("SELECT u.id FROM users u JOIN userdetails d ON d.user_id = u.id WHERE d.phone_number = ? AND u.user_type = 2 LIMIT 1");
        $stmt->execute([$school['phone']]);
        if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) return ['id' => $row['id'], 'match' => 'phone'];
    }

    // 5. name + city
    if ($school['name'] && $school['city']) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE name = ? AND city = ? AND user_type = 2 LIMIT 1");
        $stmt->execute([$school['name'], $school['city']]);
        if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) return ['id' => $row['id'], 'match' => 'name+city'];
    }

    return null;
}

// ─── INSERT HELPERS ───────────────────────────────────────────────────────────

function insertUser(PDO $pdo, array $s): int
{
    $stmt = $pdo->prepare("
        INSERT INTO users
            (user_type, name, email, address, postal_code, city, state, country,
             latitude, longitude, status, member_status, payment_status,
             email_verify_status, login, deleted_at, created_at, updated_at, uuid, date)
        VALUES
            (2, ?, ?, ?, ?, ?, ?, ?,
             ?, ?, 'a', 'lead', 0,
             0, 0, NULL, NOW(), NOW(), ?, NOW())
    ");

    $stmt->execute([
        $s['name'],
        $s['email'],
        $s['address'],
        $s['postcode'],
        $s['city'],
        $s['state'],
        $s['country'],
        $s['latitude'] ?: null,
        $s['longitude'] ?: null,
        generateUuid(),
    ]);

    return (int)$pdo->lastInsertId();
}

function insertUserdetails(PDO $pdo, int $userId, array $s): void
{
    $stmt = $pdo->prepare("
        INSERT INTO userdetails
            (user_id, phone_number, bio, webiste, instagram, facebook,
             billing_address, billing_city, billing_postcode, billing_country, billing_email,
             city, activities, facilities, created_at, updated_at)
        VALUES
            (?, ?, ?, ?, ?, ?,
             ?, ?, ?, ?, ?,
             ?, ?, ?, NOW(), NOW())
    ");

    $stmt->execute([
        $userId,
        $s['phone'],
        $s['description'],
        $s['website'],
        $s['instagram'],
        $s['facebook'],
        $s['address'],
        $s['city'],
        $s['postcode'],
        $s['country'],
        $s['email'],
        $s['city'],
        $s['activity_ids'],
        $s['facility_ids'],
    ]);
}

function insertMeta(PDO $pdo, int $userId, string $key, ?string $value): void
{
    if ($value === null || $value === '') return;

    $stmt = $pdo->prepare("
        INSERT INTO usermeta (user_id, meta_key, meta_value, status, created_at, updated_at)
        VALUES (?, ?, ?, 1, NOW(), NOW())
    ");
    $stmt->execute([$userId, $key, $value]);
}

function generateUuid(): string
{
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// ─── MAIN LOOP ────────────────────────────────────────────────────────────────

$counts   = ['imported' => 0, 'skipped' => 0, 'updated' => 0, 'failed' => 0];
$rowNum   = 1;
$imported = 0;

foreach ($rows as $row) {
    $rowNum++;

    $name = col($row, $colMap, 'name');
    if (!$name) continue; // skip blank rows

    if ($limit && $imported >= $limit) break;

    $school = [
        'external_id'    => col($row, $colMap, 'external_id'),
        'name'           => $name,
        'email'          => col($row, $colMap, 'email'),
        'phone'          => col($row, $colMap, 'phone'),
        'website'        => col($row, $colMap, 'website'),
        'instagram'      => col($row, $colMap, 'instagram'),
        'facebook'       => col($row, $colMap, 'facebook'),
        'address'        => col($row, $colMap, 'address'),
        'postcode'       => col($row, $colMap, 'postcode'),
        'city'           => col($row, $colMap, 'city'),
        'state'          => col($row, $colMap, 'state'),
        'country'        => col($row, $colMap, 'country'),
        'latitude'       => col($row, $colMap, 'latitude'),
        'longitude'      => col($row, $colMap, 'longitude'),
        'description'    => col($row, $colMap, 'description'),
        'activity_ids'   => col($row, $colMap, 'activity_ids'),
        'facility_ids'   => col($row, $colMap, 'facility_ids'),
        'listing_status' => col($row, $colMap, 'listing_status') ?: 'UNVERIFIED',
        'source'         => col($row, $colMap, 'source') ?: 'IMPORT',
        'google_place_id'=> col($row, $colMap, 'google_place_id'),
        'google_rating'  => col($row, $colMap, 'google_rating'),
        'google_reviews' => col($row, $colMap, 'google_reviews'),
        'price_from'     => col($row, $colMap, 'price_from'),
        'free_trial'     => col($row, $colMap, 'free_trial'),
        'tagline'        => col($row, $colMap, 'tagline'),
        'logo_url'       => col($row, $colMap, 'logo_url'),
        'cover_url'      => col($row, $colMap, 'cover_url'),
        'external_id'    => col($row, $colMap, 'external_id'),
    ];

    if ($dryRun) {
        echo "  Row {$rowNum}: [DRY RUN] {$name} | {$school['city']} | {$school['email']}\n";
        $counts['imported']++;
        $imported++;
        logRow($log, $rowNum, $name, 'imported', 'dry-run');
        continue;
    }

    // Duplicate check
    $dup = findDuplicate($pdo, $school);
    if ($dup) {
        $counts['skipped']++;
        logRow($log, $rowNum, $name, 'skipped', 'duplicate', $dup['id'], $dup['match']);
        continue;
    }

    // Transaction
    try {
        $pdo->beginTransaction();

        $userId = insertUser($pdo, $school);
        insertUserdetails($pdo, $userId, $school);

        // Required meta
        insertMeta($pdo, $userId, 'user_role',       'school');
        insertMeta($pdo, $userId, 'listing_status',  $school['listing_status']);
        insertMeta($pdo, $userId, 'source',          $school['source']);

        // Optional meta
        insertMeta($pdo, $userId, 'google_place_id', $school['google_place_id']);
        insertMeta($pdo, $userId, 'google_rating',   $school['google_rating']);
        insertMeta($pdo, $userId, 'google_reviews',  $school['google_reviews']);
        insertMeta($pdo, $userId, 'price_from',      $school['price_from']);
        insertMeta($pdo, $userId, 'free_trial',      $school['free_trial']);
        insertMeta($pdo, $userId, 'tagline',         $school['tagline']);
        insertMeta($pdo, $userId, 'logo_url',        $school['logo_url']);
        insertMeta($pdo, $userId, 'cover_url',       $school['cover_url']);
        insertMeta($pdo, $userId, 'external_id',     $school['external_id']);

        $pdo->commit();

        $counts['imported']++;
        $imported++;
        logRow($log, $rowNum, $name, 'imported', '', $userId);

    } catch (Exception $e) {
        $pdo->rollBack();
        $counts['failed']++;
        logRow($log, $rowNum, $name, 'failed', '', null, '', $e->getMessage());
    }
}

// ─── SUMMARY ─────────────────────────────────────────────────────────────────

echo "\n=== Summary ===\n";
echo "  ✅ Imported: {$counts['imported']}\n";
echo "  ⏭  Skipped:  {$counts['skipped']}\n";
echo "  🔄 Updated:  {$counts['updated']}\n";
echo "  ❌ Failed:   {$counts['failed']}\n";

// Write log CSV
$fp = fopen($logFile, 'w');
fputcsv($fp, ['row_number', 'school_name', 'status', 'reason', 'created_user_id', 'duplicate_match_type', 'error_message']);
foreach ($log as $entry) fputcsv($fp, $entry);
fclose($fp);

echo "\nLog saved: {$logFile}\n\n";
