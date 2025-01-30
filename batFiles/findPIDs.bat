@echo off
setlocal enabledelayedexpansion

REM Check if at least one argument (port) is provided
if "%~1"=="" (
    echo No ports provided. Please provide one or more ports.
    exit /b 1
)

REM Loop through all the ports passed as arguments
for %%p in (%*) do (
    echo Checking for PID on port: %%p

    REM Run netstat and find the PID for the given port
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p"') do (
        set pid=%%a
        echo Port %%p is being used by PID: !pid!
    )

    REM If no PID is found for this port, notify the user
    if not defined pid (
        echo No process found for port %%p
    )
    echo.
)

endlocal
