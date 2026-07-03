<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CompanyController extends Controller
{
    public function show(Request $request)
    {
        return response()->json(['data' => $request->user()->company()->with('plan', 'activeSubscription')->first()]);
    }

    public function update(Request $request)
    {
        $company = $request->user()->company;

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'tax_number' => ['nullable', 'string', 'max:50'],
            'commercial_registration' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'fiscal_year_start' => ['nullable', 'date'],
        ]);

        $company->update($data);

        return response()->json(['data' => $company]);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => ['required', 'image', 'max:2048', 'mimes:png,jpg,jpeg,svg'],
        ]);

        $company = $request->user()->company;

        if ($company->logo_path) {
            Storage::disk(config('filesystems.default'))->delete($company->logo_path);
        }

        $path = $request->file('logo')->store("logos/{$company->id}", config('filesystems.default'));
        $company->update(['logo_path' => $path]);

        return response()->json(['data' => $company]);
    }

    public function logo(Request $request)
    {
        $company = $request->user()->company;
        $disk = Storage::disk(config('filesystems.default'));

        if (! $company->logo_path || ! $disk->exists($company->logo_path)) {
            abort(404);
        }

        return response($disk->get($company->logo_path), 200, [
            'Content-Type' => $disk->mimeType($company->logo_path),
        ]);
    }
}
