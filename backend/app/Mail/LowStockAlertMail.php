<?php

namespace App\Mail;

use App\Models\Company;
use Illuminate\Bus\Queueable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LowStockAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Company $company, public Collection $products)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Low stock alert - {$this->products->count()} product(s) need reordering",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.low-stock-alert',
            with: ['company' => $this->company, 'products' => $this->products],
        );
    }
}
