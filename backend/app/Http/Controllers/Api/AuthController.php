<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterCompanyRequest;
use App\Models\Company;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Services\ChartOfAccountsSeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\PermissionRegistrar;

class AuthController extends Controller
{
    /**
     * Registers a new company (tenant) with its owner user: creates the
     * company, a trial subscription, a starter chart of accounts, the
     * company's default roles, and the owner account in one transaction.
     */
    public function register(RegisterCompanyRequest $request)
    {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data) {
            $plan = $data['plan_id'] ?? null
                ? Plan::findOrFail($data['plan_id'])
                : Plan::where('name', 'Basic')->firstOrFail();

            $company = Company::create([
                'name' => $data['company_name'],
                'currency' => $data['currency'] ?? 'SAR',
                'country' => $data['country'] ?? 'SA',
                'plan_id' => $plan->id,
                'status' => 'trial',
            ]);

            Subscription::create([
                'company_id' => $company->id,
                'plan_id' => $plan->id,
                'status' => 'trial',
                'starts_at' => now(),
                'trial_ends_at' => now()->addDays(14),
            ]);

            ChartOfAccountsSeeder::seed($company);
            $company->provisionDefaultRoles();

            $owner = User::create([
                'company_id' => $company->id,
                'name' => $data['owner_name'],
                'email' => $data['owner_email'],
                'password' => $data['owner_password'],
            ]);

            app(PermissionRegistrar::class)->setPermissionsTeamId($company->id);
            $owner->assignRole('Company Owner');

            return $owner;
        });

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'user' => $user->fresh(),
            'token' => $token,
        ], 201);
    }

    public function login(LoginRequest $request)
    {
        $credentials = $request->validated();

        $user = User::where('email', $credentials['email'])->first();

        // Checked directly against the hash rather than via Auth::validate():
        // this app has no session ('web') guard usage at all - every request
        // is a bearer token - so relying on the default guard here is both
        // unnecessary and guard-config-fragile.
        if (! $user || ! Hash::check($credentials['password'], $user->password) || ! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => $user,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }
}
