<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PlanController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Plan::orderBy('price')->get()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:plans,name'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'billing_cycle' => ['required', Rule::in(['monthly', 'yearly'])],
            'max_users' => ['nullable', 'integer', 'min:1'],
            'max_invoices_per_month' => ['nullable', 'integer', 'min:1'],
            'features' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $plan = Plan::create($data);

        return response()->json(['data' => $plan], 201);
    }

    public function show(Plan $plan)
    {
        return response()->json(['data' => $plan->loadCount('companies')]);
    }

    public function update(Request $request, Plan $plan)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', Rule::unique('plans', 'name')->ignore($plan->id)],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'billing_cycle' => ['sometimes', Rule::in(['monthly', 'yearly'])],
            'max_users' => ['nullable', 'integer', 'min:1'],
            'max_invoices_per_month' => ['nullable', 'integer', 'min:1'],
            'features' => ['nullable', 'array'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $plan->update($data);

        return response()->json(['data' => $plan]);
    }

    public function destroy(Plan $plan)
    {
        if ($plan->companies()->exists()) {
            return response()->json(['message' => 'Plan is in use by one or more companies and cannot be deleted.'], 422);
        }

        $plan->delete();

        return response()->json(null, 204);
    }
}
