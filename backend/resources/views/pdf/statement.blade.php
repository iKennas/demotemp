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
    .summary-row td { font-weight: bold; border-top: 2px solid #1f2937; border-bottom: none; }
</style>
</head>
<body>
    <div class="header">
        <div>
            @if($logoPath)
                <img src="{{ $logoPath }}" style="max-height:48px; max-width:180px; margin-bottom:8px;">
            @endif
            <h1>{{ $company->name }}</h1>
            @if($company->tax_number)
                <p class="muted">VAT: {{ $company->tax_number }}</p>
            @endif
        </div>
        <div style="text-align:right">
            <h1>Statement of Account</h1>
            <p class="muted">{{ $party->name }}</p>
            <p class="muted">As of {{ \Illuminate\Support\Carbon::now()->format('Y-m-d') }}</p>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Reference</th>
                <th class="text-right">Amount</th>
                <th class="text-right">Balance</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td colspan="4">Opening Balance</td>
                <td class="text-right">{{ number_format($openingBalance, 2) }}</td>
            </tr>
            @foreach($lines as $line)
            <tr>
                <td>{{ \Illuminate\Support\Carbon::parse($line['date'])->format('Y-m-d') }}</td>
                <td style="text-transform: capitalize;">{{ $line['type'] }}</td>
                <td>{{ $line['reference'] }}</td>
                <td class="text-right">{{ number_format($line['amount'], 2) }}</td>
                <td class="text-right">{{ number_format($line['balance'], 2) }}</td>
            </tr>
            @endforeach
            <tr class="summary-row">
                <td colspan="4">Closing Balance</td>
                <td class="text-right">{{ number_format($closingBalance, 2) }}</td>
            </tr>
        </tbody>
    </table>
</body>
</html>
