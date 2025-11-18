rem cd D:\Projects\$docs\React\react-comments-master
rem d:
rem npm run build
rmdir /s /q ..\react-comments-master\src\static
move /y  ..\react-comments-master\build\static ..\react-comments-master\src\
move /y ..\react-comments-master\build\service-worker.js ..\react-comments-master\src\
move /y ..\react-comments-master\build\* ..\react-comments-master\src\comments
pause;