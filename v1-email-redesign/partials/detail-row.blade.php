@php
    $label = $label ?? '';
    $value = $value ?? '';
@endphp
<tr>
    <td style="padding:0 18px 13px 0;color:#667085;font-size:15px;line-height:22px;vertical-align:top;">
        {{ $label }}
    </td>
    <td align="right" style="padding:0 0 13px;color:#101828;font-size:15px;line-height:22px;font-weight:700;vertical-align:top;">
        {!! $value !!}
    </td>
</tr>
