<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::where('company_id', $request->user()->company_id)
            ->with('roles:id,name')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return response()->json($users);
    }

    /**
     * Invites a new user into the caller's company with one of that
     * company's roles (Company Owner / Accountant / Employee, or any
     * custom role the company has defined).
     */
    public function store(Request $request)
    {
        $companyId = $request->user()->company_id;
        $roleNames = Role::where('company_id', $companyId)->pluck('name');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:50'],
            'role' => ['required', Rule::in($roleNames)],
        ]);

        $user = User::create([
            'company_id' => $companyId,
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
        ]);
        $user->assignRole($data['role']);

        return response()->json(['data' => $user->load('roles:id,name')], 201);
    }

    public function show(User $user)
    {
        $this->authorizeSameCompany($user);

        return response()->json(['data' => $user->load('roles:id,name')]);
    }

    public function update(Request $request, User $user)
    {
        $this->authorizeSameCompany($user);

        $companyId = $request->user()->company_id;
        $roleNames = Role::where('company_id', $companyId)->pluck('name');

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
            'role' => ['sometimes', Rule::in($roleNames)],
        ]);

        $user->update(collect($data)->except('role')->all());

        if (isset($data['role'])) {
            $user->syncRoles([$data['role']]);
        }

        return response()->json(['data' => $user->fresh()->load('roles:id,name')]);
    }

    public function destroy(Request $request, User $user)
    {
        $this->authorizeSameCompany($user);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot remove your own account.'], 422);
        }

        if ($user->hasRole('Company Owner') && User::where('company_id', $user->company_id)->role('Company Owner')->count() <= 1) {
            return response()->json(['message' => 'A company must keep at least one Company Owner.'], 422);
        }

        $user->delete();

        return response()->json(null, 204);
    }

    private function authorizeSameCompany(User $user): void
    {
        abort_unless($user->company_id === request()->user()->company_id, 404);
    }
}
