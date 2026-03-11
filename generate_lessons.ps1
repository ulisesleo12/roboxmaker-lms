$baseDir = "C:\Users\Ulises\Documents\GitHub\roboxmaker-lms\Lecciones"

$grades = Get-ChildItem -Path $baseDir -Directory

$lessonsData = @{}

foreach ($grade in $grades) {
    $gradeName = $grade.Name
    $lessonsData[$gradeName] = @()
    
    $htmlFiles = Get-ChildItem -Path $grade.FullName -Filter "*.html"
    
    foreach ($file in $htmlFiles) {
        $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        # Extract Title: <h1 class="text-4xl font-bold brand-secondary-text">Todos los vehículos son importantes</h1>
        $titleMatch = [regex]::Match($content, '(?i)<h1[^>]*>(.*?)</h1>')
        $displayTitle = if ($titleMatch.Success) { $titleMatch.Groups[1].Value.Trim() } else { $file.BaseName }

        # Extract Unit: <p class="mt-2 text-lg text-slate-600">Unidad 5: <span class="font-semibold">¡Muchas estructuras para jugar!</span></p>
        $unitMatch = [regex]::Match($content, '(?i)Unidad\s*(\d+)')
        $unidad = if ($unitMatch.Success) { "UNIDAD " + $unitMatch.Groups[1].Value } else { "UNIDAD 1" }

        $lessonNumMatch = [regex]::Match($content, '(?i)Lecci.n\s*(\d+)')
        $lessonNum = if ($lessonNumMatch.Success) { [int]$lessonNumMatch.Groups[1].Value } else { 1 }
        
        # User UX requests only the code as the number
        $lessonCode = "$lessonNum"

        # Extract Duration: <td class="py-3 text-slate-600">45 minutos</td> (after Tiempo Estimado)
        $durationMatch = [regex]::Match($content, '(?i)Tiempo Estimado:[\s\S]*?<td[^>]*>(.*?)</td>')
        $duration = if ($durationMatch.Success) { $durationMatch.Groups[1].Value.Trim() } else { "45 min" }
        # Clean up "minutos" to just "min" for UI
        $duration = $duration -replace 'minutos', 'min'

        # Extract an Indicator/Description: <p class="text-slate-700">Ejemplifica la importancia de las vías...</p>
        # Often after "Indicador de Logro:"
        $descMatch = [regex]::Match($content, '(?i)Indicador de Logro:[\s\S]*?<p[^>]*>(.*?)</p>')
        $description = if ($descMatch.Success) { $descMatch.Groups[1].Value.Trim() } else { "Explora los conceptos principales de esta lección interactiva." }
        
        # Strip HTML tags from description just in case
        $description = [regex]::Replace($description, '<[^>]+>', '')

        # Category Inference (Nuevos 5 Pilares Transversales)
        $steamCategory = "Logica y Pensamiento Computacional" # Default fallback
        $combinedText = "$displayTitle $description"
        
        if ($combinedText -match '(?i)integrador|laboratorio|veh.cul|funcional|grafic|publicidad|proyecto.final|steam') {
            $steamCategory = "Laboratorio STEAM"
        }
        elseif ($combinedText -match '(?i)program|bloque|python|algoritmo|condicional|l.gica|secuenci|error|debug|c.digo|matem.tic|comput|circuit|sensor') {
            $steamCategory = "Logica y Pensamiento Computacional"
        }
        elseif ($combinedText -match '(?i)mec.nic|m.quina|simple|estructur|polea|motor|impresi.n|3D|prototip|imprimir|constru|maker|f.sica|energ.a') {
            $steamCategory = "Ingenieria y Movimiento Maker"
        }
        elseif ($combinedText -match '(?i)multimedia|video|web|org.nic|pixel|IA|generativ|logo|arte|dise.o|dibuj|color|pint|anim|m.sica') {
            $steamCategory = "Creatividad y Diseno Digital"
        }
        elseif ($combinedText -match '(?i)productividad|seguridad|ciberseguridad|huella|netiqueta|alfabeti|documento|tabla|ciudadan|internet|privacidad|comunidad|red|simulacro|debate|sociedad|derecho') {
            $steamCategory = "Alfabetizacion y Ciudadania Digital"
        }

        $lessonObj = @{
            id          = $file.BaseName
            title       = $displayTitle
            code        = $lessonCode
            num         = $lessonNum
            path        = "Lecciones/$gradeName/$($file.Name)"
            unidad      = $unidad
            duracion    = $duration
            description = $description
            category    = $steamCategory
        }
        
        $lessonsData[$gradeName] += $lessonObj
    }
    
    # Sort array of objects numerically by the lesson number before converting to JSON
    $lessonsData[$gradeName] = $lessonsData[$gradeName] | Sort-Object { $_.num }
}

$jsonOutput = $lessonsData | ConvertTo-Json -Depth 5 -Compress
$jsContent = "const LESSONS_DATABASE = $jsonOutput;"
Set-Content -Path "C:\Users\Ulises\Documents\GitHub\roboxmaker-lms\lessonsData.js" -Value $jsContent -Encoding UTF8

Write-Host "Lessons data generated successfully at lessonsData.js"
