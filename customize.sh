#!/sbin/sh

SKIPUNZIP=0

# Extract verify.sh
ui_print "- Extracting verify.sh"
unzip -o "$ZIPFILE" 'verify.sh' -d "$TMPDIR" >&2
if [ ! -f "$TMPDIR/verify.sh" ]; then
  ui_print "*********************************************************"
  ui_print "! Unable to extract verify.sh!"
  ui_print "! This zip may be corrupted, please try downloading again"
  abort    "*********************************************************"
fi
. "$TMPDIR/verify.sh"

# Base check
extract "$ZIPFILE" 'customize.sh' "$TMPDIR"
extract "$ZIPFILE" 'verify.sh' "$TMPDIR"
extract "$ZIPFILE" 'util_functions.sh' "$TMPDIR"
. "$TMPDIR/util_functions.sh"
check_android_version
check_magisk_version
check_incompatible_module

# Extract module files
ui_print "- Extracting addon files"
unzip -o "$ZIPFILE" 'addon/*' -d $MODPATH >&2
sleep 1

ui_print "                                                                                                                                    "
ui_print "ATTENTION!"
ui_print "XPOSED/LSPOSED REQUIRED"
ui_print "                                                                                                                                    "
sleep 5

ui_print "##########################################"
ui_print "         Face unlock universal            "
ui_print "##########################################"
sleep 0.3
ui_print " • Device       : $(getprop ro.product.system.model) "
ui_print " • Brand        : $(getprop ro.product.system.brand) "
ui_print " • Arm Version  : $(getprop ro.product.cpu.abi) "
ui_print " • Sdk Version  : $(getprop ro.build.version.sdk) "
ui_print "##########################################"
sleep 1

ui_print "-  Installing face unlock"
pm install -r "$MODPATH/addon/1.apk";
ui_print "                                                                                                                                    " 
sleep 5

ui_print "- Installing module xposed"
pm install -r "$MODPATH/addon/2.apk";
sleep 5
ui_print "##########################################"
sleep 1

ui_print "- Extracting lib files"
mkdir /data/data/ax.nd.faceunlock/files
sleep 0.5
cp -af  $MODPATH/addon/facelibs /data/data/ax.nd.faceunlock/files/;
sleep 5
ui_print "- Done"
sleep 0.5
ui_print " ---------------------------------------- "
ui_print "| First, enable module in xposed/lsposed |"
ui_print "|        Then restart the device         |"                                                     
ui_print " -------------------—-------------------- "
sleep 2
ui_print "##########################################"
ui_print "Thanks To"
ui_print "• Allah swt"
ui_print "• Sony XZ2&XZ3 INDONESIA"
ui_print "• Xda developer"
ui_print "• All my friends who contributed to the"
ui_print "development of the project and many others"
ui_print "##########################################"
ui_print "          Telegram : @exnz256             "
ui_print "##########################################"
sleep 1

rm -rf /data/adb/modules_update/Face_unlock
rm -rf /data/adb/modules/Face_unlock
sleep 0.5

ui_print "- Cache cleared"