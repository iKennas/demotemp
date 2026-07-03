<?php

namespace App\Http\Middleware;

use App\Models\Company;
use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpFoundation\Response;

class SetPermissionsTeamId
{
    /**
     * Scopes Spatie's team-aware permission checks to the authenticated
     * user's company for the duration of the request (or the platform
     * sentinel team for Super Admin users with no company).
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($user = $request->user()) {
            app(PermissionRegistrar::class)
                ->setPermissionsTeamId($user->company_id ?? Company::PLATFORM_TEAM_ID);
        }

        return $next($request);
    }
}
