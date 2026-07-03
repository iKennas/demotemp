<?php

namespace App\Services;

use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Support\Facades\Storage;

class InvoicePdfService
{
    public function render(Invoice $invoice): string
    {
        $invoice->loadMissing('items', 'company', 'customer', 'supplier');
        $party = $invoice->type === 'sales' ? $invoice->customer : $invoice->supplier;

        PdfLogoResolver::sweepTempFiles();

        $qrImagePath = null;
        if ($invoice->zatca_qr_code) {
            $builder = new Builder(
                writer: new PngWriter,
                data: $invoice->zatca_qr_code,
                size: 240,
                margin: 0,
            );
            $qrImagePath = storage_path('app/tmp/qr-'.$invoice->id.'-'.uniqid().'.png');
            if (! is_dir(dirname($qrImagePath))) {
                mkdir(dirname($qrImagePath), 0755, true);
            }
            file_put_contents($qrImagePath, $builder->build()->getString());
        }

        $logoPath = PdfLogoResolver::resolve($invoice->company);

        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'party' => $party,
            'qrImagePath' => $qrImagePath,
            'logoPath' => $logoPath,
        ])->setPaper('a4');

        // Note: the QR image (and, by the same code path, the logo) has been
        // observed rendering blank specifically under `php artisan serve`
        // (PHP's built-in dev server) on this Windows dev machine, while the
        // identical code renders it correctly under `artisan tinker` (CLI
        // SAPI). The invoice text/totals/layout all render correctly either
        // way, and the ZATCA QR *data* is stored regardless (Invoice::
        // zatca_qr_code) independent of the PDF image. Re-verify both images
        // specifically once deployed behind php-fpm (the production target),
        // which is a different execution model than the built-in server and
        // may not share this quirk.
        //
        // Not deleting the temp files synchronously here on purpose - dompdf's
        // image pipeline needs them to persist past this call in ways that
        // aren't obvious from its public API. Stale files are swept on the
        // next call instead - see PdfLogoResolver::sweepTempFiles().
        return $pdf->output();
    }

    /**
     * Renders and persists the PDF to storage, saving the path on the
     * invoice so subsequent downloads don't need to regenerate it.
     */
    public function generateAndStore(Invoice $invoice): string
    {
        $output = $this->render($invoice);
        $path = "invoices/{$invoice->company_id}/{$invoice->invoice_number}.pdf";
        Storage::put($path, $output);
        $invoice->update(['pdf_path' => $path]);

        return $path;
    }
}
