// This file is part of the AppIndicator/KStatusNotifierItem GNOME Shell extension
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

const Gio = imports.gi.Gio
const GLib = imports.gi.GLib

const Extension = imports.misc.extensionUtils.getCurrentExtension()

const AppIndicator = Extension.imports.appIndicator
const IndicatorStatusIcon = Extension.imports.indicatorStatusIcon
const Interfaces = Extension.imports.interfaces
const Util = Extension.imports.util


// TODO: replace with org.freedesktop and /org/freedesktop when approved
const KDE_PREFIX = 'org.kde';

const WATCHER_BUS_NAME = KDE_PREFIX + '.StatusNotifierWatcher';
const WATCHER_OBJECT = '/StatusNotifierWatcher';

const DEFAULT_ITEM_OBJECT_PATH = '/StatusNotifierItem';

const BUS_ADDRESS_REGEX = /([a-zA-Z0-9._-]+\.[a-zA-Z0-9.-]+)|(:[0-9]+\.[0-9]+)$/

/*
 * The StatusNotifierWatcher class implements the StatusNotifierWatcher dbus object
 */
var StatusNotifierWatcher = class AppIndicators_StatusNotifierWatcher {

    constructor(watchDog) {
        this._watchDog = watchDog;
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(Interfaces.StatusNotifierWatcher, this);
        this._dbusImpl.export(Gio.DBus.session, WATCHER_OBJECT);
        this._cancellable = new Gio.Cancellable;
        this._everAcquiredName = false;
        this._ownName = Gio.DBus.session.own_name(WATCHER_BUS_NAME,
                                                  Gio.BusNameOwnerFlags.NONE,
                                                  this._acquiredName.bind(this),
                                                  this._lostName.bind(this));
        this._items = { };
        this._nameWatcher = { };
        this._serviceWatcher = { };
        this._startUpCompletionHelper = new Util.StartUpCompletionHelper();

        this._seekStatusNotifierItems();
    }

    _acquiredName() {
        this._watchDog.nameAcquired = true;
    }

    _lostName() {
        if (this._everAcquiredName)
            Util.Logger.debug('Lost name' + WATCHER_BUS_NAME);
        else
            Util.Logger.warn('Failed to acquire ' + WATCHER_BUS_NAME);
        this._watchDog.nameAcquired = false;
    }


    // create a unique index for the _items dictionary
    _getItemId(bus_name, obj_path) {
        return bus_name + obj_path;
    }

    _registerItem(service, bus_name, obj_path) {
        let id = this._getItemId(bus_name, obj_path);

        if (id in this._items) {
            Util.Logger.warn("Item "+id+" is already registered");
            return;
        }

        Util.Logger.debug("Registering StatusNotifierItem "+id);

        let indicator = new AppIndicator.AppIndicator(bus_name, obj_path);
        this._items[id] = indicator;

        // if the desktop is not ready delay the icon creation
        this._startUpCompletionHelper.whenStartUpComplete(() => {
            // check that the indicator has not been removed while we were waiting for the startup completion
            if (id in this._items) {
                let visual = new IndicatorStatusIcon.IndicatorStatusIcon(indicator);
                indicator.connect('destroy', () => visual.destroy());
            }
        });

        this._nameWatcher[id] = Gio.DBus.session.watch_name(bus_name, Gio.BusNameWatcherFlags.NONE, null,
            () => this._itemVanished(id));

        if (service != bus_name && service.match(BUS_ADDRESS_REGEX)) {
            indicator._uniqueId = service;
            this._serviceWatcher[id] = Gio.DBus.session.watch_name(service,
                Gio.BusNameWatcherFlags.NONE, null,
                () => this._itemVanished(id));
        }

        this._dbusImpl.emit_signal('StatusNotifierItemRegistered', GLib.Variant.new('(s)',
            [indicator._uniqueId]));
        this._dbusImpl.emit_property_changed('RegisteredStatusNotifierItems', GLib.Variant.new('as', this.RegisteredStatusNotifierItems));
    }

    _ensureItemRegistered(service, bus_name, obj_path) {
        let id = this._getItemId(bus_name, obj_path);

        if (id in this._items) {
            //delete the old one and add the new indicator
            Util.Logger.debug("Attempting to re-register "+id+"; resetting instead");
            this._items[id].reset();
            return;
        }

        this._registerItem(service, bus_name, obj_path)
    }

    _seekStatusNotifierItems() {
        // Some indicators (*coff*, dropbox, *coff*) do not re-register again
        // when the plugin is enabled/disabled, thus we need to manually look
        // for the objects in the session bus that implements the
        // StatusNotifierItem interface...
        Util.traverseBusNames(Gio.DBus.session, this._cancellable, (bus, name, cancellable) => {
            Util.introspectBusObject(bus, name, cancellable, (node_info) => {
                return Util.dbusNodeImplementsInterfaces(node_info, ['org.kde.StatusNotifierItem']);
            }, (name, path) => {
                let id = this._getItemId(name, path);
                if (!this._items[id]) {
                    Util.Logger.debug("Using Brute-force mode for StatusNotifierItem "+id);
                    this._registerItem(path, name, path);
                }
            })
        });
    }

    RegisterStatusNotifierItemAsync(params, invocation) {
        // it would be too easy if all application behaved the same
        // instead, ayatana patched gnome apps to send a path
        // while kde apps send a bus name
        let [service] = params;
        let bus_name = null, obj_path = null;

        if (service.charAt(0) == '/') { // looks like a path
            bus_name = invocation.get_sender();
            obj_path = service;
        } else if (service.match(BUS_ADDRESS_REGEX)) {
            bus_name = Util.getUniqueBusNameSync(invocation.get_connection(), service);
            obj_path = DEFAULT_ITEM_OBJECT_PATH;
        }

        if (!bus_name || !obj_path) {
            let error = "Impossible to register an indicator for parameters '"+
                        service.toString()+"'";
            Util.Logger.warn(error);

            invocation.return_dbus_error('org.gnome.gjs.JSError.ValueError',
                                         error);
            return;
        }

        this._ensureItemRegistered(service, bus_name, obj_path);

        invocation.return_value(null);
    }

    _itemVanished(id) {
        // FIXME: this is useless if the path name disappears while the bus stays alive (not unheard of)
        if (id in this._items) {
            this._remove(id);
        }
    }

    _remove(id) {
        const indicator = this._items[id];
        const uniqueId = indicator._uniqueId;
        indicator.destroy();
        delete this._items[id];
        Gio.DBus.session.unwatch_name(this._nameWatcher[id]);
        delete this._nameWatcher[id];

        if (id in this._serviceWatcher) {
            Gio.DBus.session.unwatch_name(this._serviceWatcher[id]);
            delete this._serviceWatcher[id];
        }
        this._dbusImpl.emit_signal('StatusNotifierItemUnregistered',
            GLib.Variant.new('(s)', [uniqueId]));
        this._dbusImpl.emit_property_changed('RegisteredStatusNotifierItems',
            GLib.Variant.new('as', this.RegisteredStatusNotifierItems));
    }

    RegisterStatusNotifierHostAsync(_service, invocation) {
        invocation.return_error_literal(
            Gio.DBusError,
            Gio.DBusError.NOT_SUPPORTED,
            'Registering additional notification hosts is not supported');
    }

    IsNotificationHostRegistered() {
        return true;
    }

    get RegisteredStatusNotifierItems() {
        return Object.values(this._items).map(i => i.uniqueId);
    }

    get IsStatusNotifierHostRegistered() {
        return true;
    }

    get ProtocolVersion() {
        return 0;
    }

    destroy() {
        if (!this._isDestroyed) {
            for (const id in this._items)
                this._remove(id);
            delete this._items;
            // this doesn't do any sync operation and doesn't allow us to hook up the event of being finished
            // which results in our unholy debounce hack (see extension.js)
            Gio.DBus.session.unown_name(this._ownName);
            this._cancellable.cancel();
            this._dbusImpl.unexport();
            this._isDestroyed = true;
        }
    }
};
