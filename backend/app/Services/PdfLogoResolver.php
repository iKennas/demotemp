<?php

namespace App\Services;

use App\Models\Company;
use Illuminate\Support\Facades\Storage;

/**
 * Shared by every PDF service (invoices, statements, reports): dompdf needs
 * a local filesystem path, but the configured storage disk may be remote
 * (R2), so the logo is downloaded into a local temp file. See the long note
 * in InvoicePdfService about why images go through a real temp file rather
 * than a data URI.
 */
class PdfLogoResolver
{
    public static function resolve(Company $company): ?string
    {
        if (! $company->logo_path) {
            return null;
        }

        $disk = Storage::disk(config('filesystems.default'));
        if (! $disk->exists($company->logo_path)) {
            return null;
        }

        $extension = pathinfo($company->logo_path, PATHINFO_EXTENSION) ?: 'png';
        $path = storage_path('app/tmp/logo-'.$company->id.'-'.uniqid().'.'.$extension);
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0755, true);
        }
        file_put_contents($path, $disk->get($company->logo_path));

        return $path;
    }

    public static function sweepTempFiles(): void
    {
        $dir = storage_path('app/tmp');
        if (! is_dir($dir)) {
            return;
        }

        // Two globs, not GLOB_BRACE: that flag isn't available on all
        // platforms (notably missing on some minimal/Alpine Linux builds).
        $files = array_merge(glob("{$dir}/qr-*.*") ?: [], glob("{$dir}/logo-*.*") ?: []);
        foreach ($files as $file) {
            if (filemtime($file) < time() - 60) {
                @unlink($file);
            }
        }
    }
}
