$baseDir = "C:\Users\Ulises\Documents\GitHub\roboxmaker-lms\Lecciones"
$htmlFiles = Get-ChildItem -Path $baseDir -Filter "*.html" -Recurse

$changedCount = 0

foreach ($file in $htmlFiles) {
    # Lee el archivo en UTF-8
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    
    # Expresión regular para encontrar cualquier ruta que termine en Visor3D.html dentro del iframe
    # Esto atrapará src="../Primaria1/Visor3D.html", src="./Visor3D.html", src="Visor3D.html", etc.
    $newContent = $content -replace '(?i)src="[^"]*visor3d\.html"', 'src="../../visor3d.html"'
    
    # Solo guarda si hubo cambios para optimizar
    if ($content -cne $newContent) {
        $utf8Bom = New-Object System.Text.UTF8Encoding($true)
        [System.IO.File]::WriteAllText($file.FullName, $newContent, $utf8Bom)
        $changedCount++
    }
}

Write-Host "Procesamiento completado: $changedCount archivos actualizados exitosamente corrigiendo la ruta del Visor 3D."
