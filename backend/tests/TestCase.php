<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Sanctum's token guard caches its resolved user on first use and
     * won't re-resolve for a new bearer token within the same test process
     * (unlike real requests, which each get a fresh guard). Call this
     * before switching to a different user's token mid-test.
     */
    protected function forgetAuthenticatedGuards(): void
    {
        $this->app['auth']->forgetGuards();
    }
}
