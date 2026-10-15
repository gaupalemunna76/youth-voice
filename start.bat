@echo off
title Youth Voice
cd /d "%~dp0"
python serve.py
if errorlevel 1 (
  echo.
  echo Could not start. Make sure Python is installed, then try again.
  pause
)
