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

        # Category Inference (Pensamiento Computacional, Creatividad y Diseno Digital, Herramientas de Productividad, Ciudadania Digital)
        $steamCategory = "Pensamiento Computacional" # Default fallback
        $combinedText = "$displayTitle $description"
        
        if ($combinedText -match '(?i)program|robot|l.gica|c.digo|algoritmo|secuenci|instrucci|matem.tic|resolver|problem|circuit|sensor|motor|engranaje|m.quina|tecnolog|comput|dron|f.sica|energ.a|constru') {
            $steamCategory = "Pensamiento Computacional"
        }
        elseif ($combinedText -match '(?i)arte|dibuj|dise.|creativid|color|m.sica|historia|relato|cuento|pintura|animar|modelad|3d|mitolog|civilizaci|f.bula|literatura|simetr.a') {
            $steamCategory = "Creatividad y Diseno Digital"
        }
        elseif ($combinedText -match '(?i)escritura|texto|herramienta|procesador|documento|calcular|tabla|gr.fico|presentaci.n|manual|instruccional|noticia') {
            $steamCategory = "Herramientas de Productividad"
        }
        elseif ($combinedText -match '(?i)internet|seguridad|ciberseguridad|red|compartir|regla|comportamient|huella|digital|responsabilidad|privacidad|ciudadan|comunidad|sociedad|derecho|normas|se.al|familia|vivienda|pa.s') {
            $steamCategory = "Ciudadania Digital"
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
