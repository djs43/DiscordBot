@echo off
setlocal enabledelayedexpansion

:: Get the port number as an argument
set PORT=%1

:: Check if a port was provided
if "%PORT%"=="" (
    echo Please provide a port number.
    exit /b
)

:: Find the PID of the process running on the specified port (handles both TCP and UDP)
for /f "tokens=* delims=" %%a in ('netstat -ano ^| findstr ":%PORT%"') do (
    set "line=%%a"
    set PID=
    for %%b in (!line!) do (
        set PID=%%b
    )
    goto :found
)

:: If no process was found, exit
echo No process found running on port %PORT%.
exit /b

:found
:: Output the PID for verification
echo Found process with PID !PID! running on port %PORT%.

:: Kill the process using the PID
taskkill /PID !PID! /F
if errorlevel 1 (
    echo Failed to terminate the process with PID !PID!.
) else (
    echo Process with PID !PID! terminated successfully.
)

endlocal
