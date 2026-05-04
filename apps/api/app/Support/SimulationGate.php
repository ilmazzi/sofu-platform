<?php

namespace App\Support;

/**
 * Flag simulazione admin: con `config:cache`, `config('sofu.simulation_enabled')` resta stale dopo aver
 * modificato solo il file `.env` sul disco (tipico con Docker bind mount). Per questo flag leggiamo
 * il valore corrente dal file quando la configurazione è in cache.
 */
final class SimulationGate
{
    public static function enabled(): bool
    {
        if (! app()->configurationIsCached()) {
            return (bool) config('sofu.simulation_enabled');
        }

        $fromFile = self::readSimulationEnabledFromEnvFile();
        if ($fromFile !== null) {
            return $fromFile;
        }

        return (bool) config('sofu.simulation_enabled');
    }

    private static function readSimulationEnabledFromEnvFile(): ?bool
    {
        $path = base_path('.env');
        if (! is_readable($path)) {
            return null;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            return null;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            if (! preg_match('/^SIMULATION_ENABLED\s*=\s*(.*)$/', $line, $m)) {
                continue;
            }
            $val = trim($m[1], " \t\"'");
            if ($val === '') {
                return null;
            }

            return filter_var($val, FILTER_VALIDATE_BOOL);
        }

        return null;
    }
}
