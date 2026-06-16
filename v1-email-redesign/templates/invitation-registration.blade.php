@php
    $title = $title ?? 'You have been invited to Martial App';
    $preheader = $preheader ?? 'Activate your account and join your school on Martial App.';
    $recipientName = $recipientName ?? ($invite->name ?? null);
    $schoolName = $schoolName ?? ($school->name ?? ($user->name ?? config('app.name', 'Martial App')));
    $schoolCity = $schoolCity ?? ($school->city ?? ($user->city ?? null));
    $schoolCountry = $schoolCountry ?? ($school->country ?? ($user->country ?? null));
    $location = collect([$schoolCity, $schoolCountry])->filter()->implode(', ');
    $address = $address ?? ($school->address ?? ($user->address ?? null));
    $website = $website ?? ($school->website ?? ($user->details->website ?? null));
    $googleRating = $googleRating ?? ($school->google_rating ?? ($user->details->google_rating ?? null));
    $googleReviews = $googleReviews ?? ($school->google_reviews ?? ($user->details->google_reviews ?? null));
    $ctaUrl = $ctaUrl ?? ($inviteUrl ?? '#');
    $secondaryCtaUrl = $secondaryCtaUrl ?? ($profileUrl ?? null);
    $secondaryCtaLabel = $secondaryCtaLabel ?? 'Preview profile';
    $legalText = $legalText ?? 'You received this invitation because your school added you to Martial App.';
@endphp
@extends('emails.layouts.martial')

@section('content')
    <tr>
        <td align="center" style="padding:0 0 28px;">
            <h1 style="margin:0;color:#101828;font-size:28px;line-height:35px;font-weight:800;letter-spacing:0;">
                You have been invited to Martial App
            </h1>
            <p style="margin:10px 0 0;color:#667085;font-size:15px;line-height:23px;">
                Join {{ $schoolName }} and activate your account.
            </p>
        </td>
    </tr>

    <tr>
        <td style="padding:0 0 30px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#FFFFFF;border:1px solid #E5EAF0;border-radius:24px;overflow:hidden;">
                <tr>
                    <td style="padding:0;">
                        @if(!empty($bannerUrl ?? null))
                            <img src="{{ $bannerUrl }}" width="572" alt="{{ $schoolName }}" style="display:block;width:100%;max-width:572px;height:auto;border:0;">
                        @else
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#0E3A7A;">
                                <tr>
                                    <td align="center" style="padding:34px 28px;">
                                        <span style="display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.14);border-radius:999px;padding:7px 14px;color:#FFFFFF;font-size:13px;line-height:16px;font-weight:800;">Profile invitation</span>
                                        <h2 style="margin:16px 0 0;color:#FFFFFF;font-size:30px;line-height:36px;font-weight:800;">{{ $schoolName }}</h2>
                                        @if(!empty($location))
                                            <p style="margin:10px 0 0;color:#D0D5DD;font-size:15px;line-height:22px;">{{ $location }}</p>
                                        @endif
                                    </td>
                                </tr>
                            </table>
                        @endif
                    </td>
                </tr>
                <tr>
                    <td style="padding:22px 24px 24px;background:#F9FAFB;">
                        <p style="margin:0 0 14px;color:#101828;font-size:18px;line-height:24px;font-weight:800;">{{ $schoolName }}</p>
                        @if($googleRating || $googleReviews)
                            <p style="margin:0 0 8px;color:#667085;font-size:14px;line-height:21px;">
                                Google rating: {{ $googleRating ?: '-' }}@if($googleReviews) · {{ $googleReviews }} reviews @endif
                            </p>
                        @endif
                        @if(!empty($address))
                            <p style="margin:0 0 8px;color:#667085;font-size:14px;line-height:21px;">Address: {{ $address }}</p>
                        @endif
                        @if(!empty($website))
                            <p style="margin:0 0 14px;color:#667085;font-size:14px;line-height:21px;">
                                Website:
                                <a href="{{ $website }}" style="color:#0870E2;text-decoration:none;">{{ preg_replace('#^https?://#', '', rtrim($website, '/')) }}</a>
                            </p>
                        @endif
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                            <tr>
                                <td style="border-top:1px solid #E5EAF0;font-size:1px;line-height:1px;">&nbsp;</td>
                            </tr>
                        </table>
                        <p style="margin:14px 0 0;color:#667085;font-size:13px;line-height:20px;">
                            <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#F59E0B;margin-right:8px;vertical-align:middle;"></span>
                            Profile visible · not yet claimed
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    @include('emails.partials.divider')

    <tr>
        <td style="padding:28px 0;">
            <p style="margin:0 0 14px;color:#667085;font-size:16px;line-height:25px;">
                {{ $recipientName ? 'Hi '.$recipientName.',' : 'Hi,' }}
            </p>
            <p style="margin:0;color:#667085;font-size:16px;line-height:25px;">
                You have been invited to join <strong style="color:#101828;">{{ $schoolName }}</strong> on Martial App.
                Activate your account to access your training dashboard, classes and membership details.
            </p>
            <p style="margin:18px 0 0;color:#667085;font-size:16px;line-height:25px;">
                Your profile is already visible to martial artists searching nearby, but it is not claimed yet.
            </p>
        </td>
    </tr>

    @include('emails.partials.divider')

    <tr>
        <td style="padding:28px 0 0;">
            @include('emails.partials.button', ['href' => $ctaUrl, 'label' => 'Activate your account'])
            @if($secondaryCtaUrl)
                <div style="height:10px;font-size:10px;line-height:10px;">&nbsp;</div>
                @include('emails.partials.button', ['href' => $secondaryCtaUrl, 'label' => $secondaryCtaLabel, 'variant' => 'secondary'])
            @endif
            <p style="margin:13px 0 0;color:#98A2B3;font-size:12px;line-height:18px;text-align:center;">
                If you already have an account, this link will connect it to your school.
            </p>
        </td>
    </tr>
@endsection
