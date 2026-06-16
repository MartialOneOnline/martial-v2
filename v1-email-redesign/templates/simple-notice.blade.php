@php
    $title = $title ?? 'Account notice';
    $preheader = $preheader ?? 'A Martial App account notification.';
    $recipientName = $recipientName ?? ($name ?? null);
    $message = $message ?? ($msg ?? 'We wanted to share an update about your Martial App account.');
    $ctaUrl = $ctaUrl ?? null;
    $ctaLabel = $ctaLabel ?? 'Open Martial App';
    $legalText = $legalText ?? null;
@endphp
@extends('emails.layouts.martial')

@section('content')
    <tr>
        <td style="padding:0 0 28px;">
            <h1 style="margin:0;color:#101828;font-size:30px;line-height:37px;font-weight:800;letter-spacing:0;">
                {{ $recipientName ? 'Hi '.$recipientName : $title }}
            </h1>
            @if($recipientName)
                <p style="margin:10px 0 0;color:#667085;font-size:15px;line-height:23px;">{{ $title }}</p>
            @endif
        </td>
    </tr>

    <tr>
        <td style="padding:0;">
            <p style="margin:0;color:#667085;font-size:16px;line-height:25px;">
                {!! nl2br(e($message)) !!}
            </p>
        </td>
    </tr>

    @if($ctaUrl)
        <tr>
            <td style="padding:28px 0 0;">
                @include('emails.partials.button', ['href' => $ctaUrl, 'label' => $ctaLabel])
            </td>
        </tr>
    @endif
@endsection
