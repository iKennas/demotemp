<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CompanyController extends Controller
{
    public function index(Request $request)
    {
        $companies = Company::query()
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->withCount('users')
            ->with('plan')
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 25));

        return response()->json($companies);
    }

    public function show(Company $company)
    {
        return response()->json(['data' => $company->load('plan', 'subscriptions')->loadCount('users', 'invoices')]);
    }

    public function update(Request $request, Company $company)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['active', 'suspended', 'trial'])],
        ]);

        $company->update($data);

        return response()->json(['data' => $company]);
    }

    public function destroy(Company $company)
    {
        $company->delete();

        return response()->json(null, 204);
    }
}
