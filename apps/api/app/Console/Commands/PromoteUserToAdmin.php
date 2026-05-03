<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class PromoteUserToAdmin extends Command
{
    protected $signature = 'user:promote-admin {email : The email of the user to promote}';

    protected $description = 'Promote a user to admin role';

    public function handle(): int
    {
        $email = $this->argument('email');

        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error("User with email {$email} not found.");

            return self::FAILURE;
        }

        if ($user->role === 'admin') {
            $this->info("User {$user->name} ({$user->email}) is already an admin.");

            return self::SUCCESS;
        }

        $oldRole = $user->role;
        $user->role = 'admin';
        $user->save();

        $this->info("User {$user->name} ({$user->email}) promoted from {$oldRole} to admin.");

        return self::SUCCESS;
    }
}
