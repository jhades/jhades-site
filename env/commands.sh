alias rmongo='nohup mongod --dbpath=${JHADES_MONGODB_DIR} 2>&1 > ${JHADES_LOG_DIR}/mongo.log'
alias rjhades='forever -a -f -l ${JHADES_LOG_DIR}/forever.log -o ${JHADES_LOG_DIR}/jhades.stdout.log -e ${JHADES_LOG_DIR}/jhades.stderr.log  start server.js'

alias stop_jhades='forever stopall;'

