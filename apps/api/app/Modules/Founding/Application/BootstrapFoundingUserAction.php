<?php

namespace App\Modules\Founding\Application;

use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class BootstrapFoundingUserAction
{
    /**
     * @return array{user: User, created: bool}
     */
    public function execute(string $name, string $email): array
    {
        $email = Str::lower(trim($email));
        $existing = User::query()->where('email', $email)->first();

        if ($existing !== null) {
            throw new ConflictHttpException(
                'Questa email è già registrata. Accedi per continuare a sostenere SoFu.',
            );
        }

        $user = User::query()->create([
            'name' => trim($name),
            'email' => $email,
            'password' => Hash::make(Str::password(32)),
            'role' => 'supporter',
        ]);

        event(new Registered($user));
        Auth::login($user);
        request()->session()->regenerate();

        return [
            'user' => $user,
            'created' => true,
        ];
    }
}
