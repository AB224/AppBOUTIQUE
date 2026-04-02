@echo off
start "AppBoutique API" cmd /k "cd /d E:\MyApp\AppBoutique && npm run dev --workspace server"
start "AppBoutique Web" cmd /k "cd /d E:\MyApp\AppBoutique && npm run dev --workspace client"
