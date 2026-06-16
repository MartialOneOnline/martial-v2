@php
    $emailBorder = $emailBorder ?? '#E5EAF0';
    $emailSecondary = $emailSecondary ?? '#667085';
    $emailMuted = $emailMuted ?? '#98A2B3';
    $emailPrimary = $emailPrimary ?? '#0870E2';
    $appName = $appName ?? 'Martial App';
    $supportEmail = $supportEmail ?? 'notifications@martialapp.com';
@endphp
<tr>
    <td style="padding:34px 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
                <td style="border-top:1px solid {{ $emailBorder }};font-size:1px;line-height:1px;">&nbsp;</td>
            </tr>
        </table>
    </td>
</tr>
<tr>
    <td style="padding:24px 0 0;">
        <p style="margin:0 0 3px;color:#101828;font-size:15px;line-height:22px;font-weight:800;">Have questions?</p>
        <p style="margin:0;color:{{ $emailSecondary }};font-size:14px;line-height:22px;">
            Reply to this email or write to
            <a href="mailto:{{ $supportEmail }}" style="color:#101828;text-decoration:underline;">{{ $supportEmail }}</a>.
        </p>
    </td>
</tr>
<tr>
    <td style="padding:34px 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
                <td style="border-top:1px solid {{ $emailBorder }};font-size:1px;line-height:1px;">&nbsp;</td>
            </tr>
        </table>
    </td>
</tr>
<tr>
    <td align="center" style="padding:28px 0 0;">
        @if(!empty($logoUrl))
            <img src="{{ $logoUrl }}" width="32" height="32" alt="{{ $appName }}" style="display:block;border:0;width:32px;height:32px;border-radius:9px;">
        @else
            <span style="display:inline-block;width:32px;height:32px;background:{{ $emailPrimary }};border-radius:9px;color:#FFFFFF;font-size:16px;line-height:32px;font-weight:800;text-align:center;">M</span>
        @endif
        <p style="margin:12px 0 0;color:{{ $emailSecondary }};font-size:13px;line-height:20px;">
            {{ $appName }}<br>
            The martial arts directory for academies and students
        </p>
    </td>
</tr>
