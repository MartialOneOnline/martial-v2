@php
    $emailPrimary = $emailPrimary ?? '#0870E2';
    $emailNavy = $emailNavy ?? '#0E3A7A';
    $appName = $appName ?? 'Martial App';
@endphp
@if(!empty($logoUrl))
    <img src="{{ $logoUrl }}" width="46" height="46" alt="{{ $appName }}" style="display:block;border:0;width:46px;height:46px;border-radius:13px;">
@else
    <span style="display:inline-block;width:46px;height:46px;background:{{ $emailPrimary }};border-radius:13px;color:#FFFFFF;font-size:23px;line-height:46px;font-weight:800;text-align:center;">M</span>
@endif
<p style="margin:10px 0 0;color:{{ $emailNavy }};font-size:18px;line-height:22px;font-weight:800;">
    {{ $appName }}
</p>
