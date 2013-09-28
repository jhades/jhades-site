RELEASE_VERSION=0.1-SNAPSHOT

cd ../jhades
mvn clean install
cd ../jhades-site

grunt
mkdir dist/jars
cp /Users/choupinette/.m2/repository/org/jhades/jhades/${RELEASE_VERSION}/*jar dist/jars
cp /Users/choupinette/.m2/repository/org/jhades/jhades-json-reports/${RELEASE_VERSION}/*jar dist/jars
cp /Users/choupinette/.m2/repository/org/jhades/jhades-standalone-report/${RELEASE_VERSION}/*jar dist/jars
tar cvf jhades.tar dist
gzip jhades.tar
scp jhades.tar.gz pi@192.168.1.65:/home/pi/tmp/usb/site
rm jhades.tar.gz
