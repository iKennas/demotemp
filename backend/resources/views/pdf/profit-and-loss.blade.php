<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2937; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 13px; margin: 20px 0 4px; }
    .muted { color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
    .text-right { text-align: right; }
    .summary-row td { font-weight: bold; border-top: 2px solid #1f2937; border-bottom: none; font-size: 14px; }
</style>
</head>
<body>
    <div class="header">
        <div>
            @if($logoPath)
                <img src="{{ $logoPath }}" style="max-height:48px; max-width:180px; margin-bottom:8px;">
            @endif
            <h1>{{ $company->name }}</h1>
        </div>
        <div style="text-align:right">
            <h1>Profit &amp; Loss</h1>
            <p class="muted">As of {{ \Illuminate\Support\Carbon::now()->format('Y-m-d') }}</p>
        </div>
    </div>

    <h2>Revenue</h2>
    <table>
        @foreach($revenue as $row)
        <tr><td>{{ $row['name'] }}</td><td class="text-right">{{ number_format($row['amount'], 2) }}</td></tr>
        @endforeach
        <tr class="summary-row"><td>Total Revenue</td><td class="text-right">{{ number_format($totalRevenue, 2) }}</td></tr>
    </table>

    <h2>Expenses</h2>
    <table>
        @foreach($expenses as $row)
        <tr><td>{{ $row['name'] }}</td><td class="text-right">{{ number_format($row['amount'], 2) }}</td></tr>
        @endforeach
        <tr class="summary-row"><td>Total Expenses</td><td class="text-right">{{ number_format($totalExpenses, 2) }}</td></tr>
    </table>

    <table>
        <tr class="summary-row"><td>Net Income</td><td class="text-right">{{ number_format($netIncome, 2) }}</td></tr>
    </table>
</body>
</html>
