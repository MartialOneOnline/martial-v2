@php
    $emailBorder = $emailBorder ?? '#E5EAF0';
    $top = $top ?? '0';
    $bottom = $bottom ?? '0';
@endphp
<tr>
    <td style="padding:{{ $top }} 0 {{ $bottom }};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
                <td style="border-top:1px solid {{ $emailBorder }};font-size:1px;line-height:1px;">&nbsp;</td>
            </tr>
        </table>
    </td>
</tr>
