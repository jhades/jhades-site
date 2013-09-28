forever stopall
cd /home/pi/tmp/usb/site/dist
cd ..
rm -rf dist
cd /home/pi/tmp/usb/site
gunzip jhades.tar.gz
tar xvf jhades.tar
rm jhades.tar
cd dist

forever -a -f -l ${JHADES_LOG_DIR}/forever.log -o ${JHADES_LOG_DIR}/jhades.stdout.log -e ${JHADES_LOG_DIR}/jhades.stderr.log  start server.js

echo "JHades server running ..."

ps aux | grep node
