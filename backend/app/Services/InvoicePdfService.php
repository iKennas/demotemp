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

            // endroid/qr-code's PngWriter outputs a palette (indexed-color)
            // PNG, which dompdf fails to rasterize (renders blank) - convert
            // to truecolor before writing so the QR image actually shows up.
            $qrImage = imagecreatefromstring($builder->build()->getString());
            $truecolor = imagecreatetruecolor(imagesx($qrImage), imagesy($qrImage));
            imagecopy($truecolor, $qrImage, 0, 0, 0, 0, imagesx($qrImage), imagesy($qrImage));
            imagepng($truecolor, $qrImagePath);
        }

        $logoPath = PdfLogoResolver::resolve($invoice->company);

        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'party' => $party,
            'qrImagePath' => $qrImagePath,
            'logoPath' => $logoPath,
        ])->setPaper('a4');

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
