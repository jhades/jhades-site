#!/bin/bash
WARFILE=${1}
TMPDIR=${2}
echo "Running report for file "${WARFILE}" - temporary directory: "$TMPDIR
java -cp ${JHADES_JARS} org.jhades.reports.WarReportScanner ${WARFILE} ${TMPDIR}  2>&1
exit 0