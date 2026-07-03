<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2937; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .muted { color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-size: 10px; text-transform: uppercase; color: #6b7280; }
    .text-right { text-align: right; }
    .totals { width: 260px; margin-left: auto; margin-top: 16px; }
    .totals td { border: none; padding: 3px 8px; }
    .totals .grand { font-weight: bold; font-size: 14px; border-top: 2px solid #1f2937; }
    .qr { text-align: center; margin-top: 24px; }
    .party-box { width: 48%; }
    .row { display: flex; justify-content: space-between; }
</style>
</head>
<body>
    <div class="header">
        <div>
            @if($logoPath)
                <img src="{{ $logoPath }}" style="max-height:48px; max-width:180px; margin-bottom:8px;">
            @endif
            <h1>{{ $invoice->company->name }}</h1>
            @if($invoice->company->tax_number)
                <p class="muted">VAT: {{ $invoice->company->tax_number }}</p>
            @endif
            @if($invoice->company->address)
                <p class="muted">{{ $invoice->company->address }}, {{ $invoice->company->city }}</p>
            @endif
        </div>
        <div style="text-align:right">
            <h1>{{ $invoice->type === 'sales' ? 'Invoice' : 'Purchase Invoice' }}</h1>
            <p class="muted">{{ $invoice->invoice_number }}</p>
            <p class="muted">Issue Date: {{ \Illuminate\Support\Carbon::parse($invoice->issue_date)->format('Y-m-d') }}</p>
            @if($invoice->due_date)
                <p class="muted">Due Date: {{ \Illuminate\Support\Carbon::parse($invoice->due_date)->format('Y-m-d') }}</p>
            @endif
        </div>
    </div>

    <div class="row">
        <div class="party-box">
            <p class="muted">Bill To</p>
            <strong>{{ $party->name }}</strong><br>
            @if($party->email)<span class="muted">{{ $party->email }}</span><br>@endif
            @if($party->phone)<span class="muted">{{ $party->phone }}</span><br>@endif
            @if($party->tax_number)<span class="muted">VAT: {{ $party->tax_number }}</span>@endif
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Tax %</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $item)
            <tr>
                <td>{{ $item->description }}</td>
                <td class="text-right">{{ rtrim(rtrim(number_format($item->quantity, 3), '0'), '.') }}</td>
                <td class="text-right">{{ number_format($item->unit_price, 2) }}</td>
                <td class="text-right">{{ number_format($item->tax_rate, 2) }}%</td>
                <td class="text-right">{{ number_format($item->line_total, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr><td>Subtotal</td><td class="text-right">{{ number_format($invoice->subtotal, 2) }}</td></tr>
        <tr><td>Discount</td><td class="text-right">{{ number_format($invoice->discount_total, 2) }}</td></tr>
        <tr><td>VAT</td><td class="text-right">{{ number_format($invoice->tax_total, 2) }}</td></tr>
        <tr class="grand"><td>Total ({{ $invoice->currency }})</td><td class="text-right">{{ number_format($invoice->total, 2) }}</td></tr>
    </table>

    @if($qrImagePath)
    <div class="qr">
        <img src="{{ $qrImagePath }}" width="120" height="120">
        <p class="muted">ZATCA e-invoice QR code</p>
    </div>
    @endif

    @if($invoice->notes)
    <div style="margin-top: 24px;">
        <p class="muted">Notes</p>
        <p>{{ $invoice->notes }}</p>
    </div>
    @endif
</body>
</html>
