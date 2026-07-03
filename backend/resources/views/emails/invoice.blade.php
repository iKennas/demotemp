<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; color: #1f2937;">
    <p>Dear {{ $party->name }},</p>
    <p>
        Please find attached invoice <strong>{{ $invoice->invoice_number }}</strong>
        from {{ $invoice->company->name }} for <strong>{{ number_format($invoice->total, 2) }} {{ $invoice->currency }}</strong>.
    </p>
    @if($invoice->due_date)
        <p>Payment is due by {{ \Illuminate\Support\Carbon::parse($invoice->due_date)->format('Y-m-d') }}.</p>
    @endif
    <p>Thank you for your business.</p>
    <p>{{ $invoice->company->name }}</p>
</body>
</html>
