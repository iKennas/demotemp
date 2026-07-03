<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; color: #1f2937;">
    <p>Hi,</p>
    <p>The following products at <strong>{{ $company->name }}</strong> are at or below their reorder level:</p>
    <table cellpadding="6" style="border-collapse: collapse; width: 100%;">
        <thead>
            <tr style="background:#f9fafb; text-align:left;">
                <th style="border-bottom:1px solid #e5e7eb;">Product</th>
                <th style="border-bottom:1px solid #e5e7eb;">SKU</th>
                <th style="border-bottom:1px solid #e5e7eb;">On Hand</th>
                <th style="border-bottom:1px solid #e5e7eb;">Reorder Level</th>
            </tr>
        </thead>
        <tbody>
            @foreach($products as $product)
            <tr>
                <td style="border-bottom:1px solid #f3f4f6;">{{ $product->name }}</td>
                <td style="border-bottom:1px solid #f3f4f6;">{{ $product->sku ?? '—' }}</td>
                <td style="border-bottom:1px solid #f3f4f6;">{{ $product->quantity_on_hand }}</td>
                <td style="border-bottom:1px solid #f3f4f6;">{{ $product->reorder_level }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    <p style="margin-top:16px; color:#6b7280; font-size:13px;">This is an automated daily digest from URS.</p>
</body>
</html>
