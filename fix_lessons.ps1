$baseDir = "C:\Users\Ulises\Documents\GitHub\roboxmaker-lms\Lecciones"
$htmlFiles = Get-ChildItem -Path $baseDir -Filter "*.html" -Recurse

foreach ($file in $htmlFiles) {
    # Leer el archivo asumiendo UTF-8 (como están originalmente)
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    
    # 1. Reemplazar la ruta del visor 3D para centralizarlo
    $content = $content -replace '(?i)src="(?:\./)?Visor3D\.html"', 'src="../../visor3d.html"'
    
    # 2. Guardar el archivo forzando UTF-8 CON firma BOM
    # Creamos un encoding UTF-8 explícito que SÍ emite BOM ($true)
    $utf8Bom = New-Object System.Text.UTF8Encoding($true)
    
    [System.IO.File]::WriteAllText($file.FullName, $content, $utf8Bom)
}

Write-Host "Procesamiento completado: $($htmlFiles.Count) archivos actualizados con BOM UTF-8 y Visor centralizado."
