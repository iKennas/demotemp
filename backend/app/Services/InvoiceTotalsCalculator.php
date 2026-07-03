<?php

namespace App\Services;

class InvoiceTotalsCalculator
{
    public static function lineTotal(array $item): float
    {
        $gross = $item['quantity'] * $item['unit_price'] - ($item['discount'] ?? 0);
        $tax = $gross * (($item['tax_rate'] ?? 15) / 100);

        return round($gross + $tax, 2);
    }

    /**
     * @param  array<int, array{quantity: float, unit_price: float, discount?: float, tax_rate?: float}>  $items
     * @return array{subtotal: float, discount_total: float, tax_total: float, total: float}
     */
    public static function computeTotals(array $items): array
    {
        $subtotal = 0;
        $discountTotal = 0;
        $taxTotal = 0;

        foreach ($items as $item) {
            $lineGross = $item['quantity'] * $item['unit_price'];
            $discount = $item['discount'] ?? 0;
            $taxable = $lineGross - $discount;
            $tax = $taxable * (($item['tax_rate'] ?? 15) / 100);

            $subtotal += $lineGross;
            $discountTotal += $discount;
            $taxTotal += $tax;
        }

        return [
            'subtotal' => round($subtotal, 2),
            'discount_total' => round($discountTotal, 2),
            'tax_total' => round($taxTotal, 2),
            'total' => round($subtotal - $discountTotal + $taxTotal, 2),
        ];
    }
}
