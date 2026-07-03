<?php

// Central permission catalog for the URS platform, grouped by module.
// Used by RolePermissionSeeder and by Company provisioning to keep role
// definitions consistent everywhere permissions are assigned.
return [
    'finance' => ['view', 'manage'],
    'customers' => ['view', 'manage'],
    'suppliers' => ['view', 'manage'],
    'invoices' => ['view', 'manage'],
    'cash' => ['view', 'manage'],
    'inventory' => ['view', 'manage'],
    'reports' => ['view'],
    'users' => ['view', 'manage'],
    'settings' => ['view', 'manage'],
    'audit' => ['view'],
];
