<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::query()
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->type, fn ($q) => $q->where('type', $request->type))
            ->when($request->boolean('low_stock'), fn ($q) => $q->whereColumn('quantity_on_hand', '<=', 'reorder_level')->where('track_inventory', true))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return response()->json($products);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'sku' => ['nullable', 'string', 'max:100', Rule::unique('products')->where('company_id', $request->user()->company_id)],
            'name' => ['required', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', Rule::in(['product', 'service'])],
            'category' => ['nullable', 'string', 'max:100'],
            'unit' => ['nullable', 'string', 'max:50'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'sale_price' => ['required', 'numeric', 'min:0'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'track_inventory' => ['nullable', 'boolean'],
            'quantity_on_hand' => ['nullable', 'numeric', 'min:0'],
            'reorder_level' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
        ]);

        $product = Product::create($data);

        if (($data['quantity_on_hand'] ?? 0) > 0) {
            $product->inventoryMovements()->create([
                'company_id' => $product->company_id,
                'type' => 'in',
                'quantity' => $data['quantity_on_hand'],
                'reference_type' => 'opening_stock',
                'movement_date' => now(),
                'created_by' => $request->user()->id,
            ]);
        }

        return response()->json(['data' => $product], 201);
    }

    public function show(Product $product)
    {
        return response()->json(['data' => $product]);
    }

    public function update(Request $request, Product $product)
    {
        $data = $request->validate([
            'sku' => ['nullable', 'string', 'max:100', Rule::unique('products')->where('company_id', $request->user()->company_id)->ignore($product->id)],
            'name' => ['sometimes', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'unit' => ['nullable', 'string', 'max:50'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'sale_price' => ['sometimes', 'numeric', 'min:0'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'reorder_level' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string'],
        ]);

        $product->update($data);

        return response()->json(['data' => $product]);
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return response()->json(null, 204);
    }

    public function adjustStock(Request $request, Product $product)
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['in', 'out', 'adjustment'])],
            'quantity' => ['required', 'numeric', 'min:0.001'],
            'notes' => ['nullable', 'string'],
        ]);

        $movement = $product->inventoryMovements()->create([
            'company_id' => $product->company_id,
            'type' => $data['type'],
            'quantity' => $data['quantity'],
            'reference_type' => 'manual',
            'movement_date' => now(),
            'notes' => $data['notes'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        $delta = $data['type'] === 'out' ? -$data['quantity'] : $data['quantity'];
        $product->increment('quantity_on_hand', $delta);

        return response()->json(['data' => $movement, 'quantity_on_hand' => $product->fresh()->quantity_on_hand]);
    }
}
