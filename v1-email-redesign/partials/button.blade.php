@php
    $emailPrimary = $emailPrimary ?? '#0870E2';
    $href = $href ?? '#';
    $label = $label ?? 'Open';
    $variant = $variant ?? 'primary';
    $bg = $variant === 'secondary' ? '#FFFFFF' : $emailPrimary;
    $color = $variant === 'secondary' ? '#0E3A7A' : '#FFFFFF';
    $border = $variant === 'secondary' ? '1px solid #BFDBFE' : '1px solid '.$emailPrimary;
@endphp
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
        <td align="center" bgcolor="{{ $bg }}" style="background:{{ $bg }};border:{{ $border }};border-radius:12px;">
            <a href="{{ $href }}" target="_blank" style="display:block;padding:16px 18px;color:{{ $color }};font-size:15px;line-height:20px;font-weight:800;text-decoration:none;">
                {{ $label }}
            </a>
        </td>
    </tr>
</table>
