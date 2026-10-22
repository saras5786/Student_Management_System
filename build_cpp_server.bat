@echo off
echo ========================================================
echo   COMPILING ADITYA UNIVERSITY C++ BACKEND (MSVC x64)
echo ========================================================

call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" x64

if errorlevel 1 (
    echo [ERROR] Failed to initialize MSVC x64 environment.
    exit /b 1
)

cd /d "d:\Student_Management_System"

echo [Step 1/2] Compiling SQLite amalgamation (sqlite3.c)...
if not exist "cpp-backend\sqlite3.obj" (
    cl /c /O2 /EHsc /I cpp-backend\include cpp-backend\src\sqlite3.c /Focpp-backend\sqlite3.obj /nologo
    if errorlevel 1 (
        echo [ERROR] Failed to compile sqlite3.c
        exit /b 1
    )
) else (
    echo [Step 1/2] Reusing cached cpp-backend\sqlite3.obj
)

echo [Step 2/2] Compiling C++20 Server (main.cpp)...
cl /std:c++20 /EHsc /O2 /I cpp-backend\include cpp-backend\src\main.cpp cpp-backend\sqlite3.obj /Fe:server.exe ws2_32.lib /nologo

if errorlevel 1 (
    echo [ERROR] Compilation of server.exe failed!
    exit /b 1
)

echo ========================================================
echo   [SUCCESS] server.exe built successfully!
echo ========================================================
