@echo off
cd /d "%~dp0backend"
php artisan serve --port=8123
