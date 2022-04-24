'use strict';

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const St = imports.gi.St;
const Soup = imports.gi.Soup
const Lang = imports.lang;
const Mainloop    = imports.mainloop;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

// For compatibility checks, as described above
const Config = imports.misc.config;
const SHELL_MINOR = parseInt(Config.PACKAGE_VERSION.split('.')[1]);


const _httpSession = new Soup.SessionAsync();
const url = 'https://api.carbonintensity.org.uk/intensity'


var label = null

// We'll extend the Button class from Panel Menu so we can do some setup in
// the init() function.
var ExampleIndicator = GObject.registerClass(
	{
		GType: 'ExampleIndicator'
	},
	class ExampleIndicator extends PanelMenu.Button {
         _init() {
           super._init(0.0, `${Me.metadata.name} Indicator`, false);

           this.text = new St.Label({ style_class: 'carbon-intensity-label', text: "124" });
	       label = this.text
           this.actor.add_child(this.text);

	       updateUI();
        }
    }
)

function updateUI() {
	let request = Soup.Message.new('GET',url);
        _httpSession.queue_message(request, function(_httpSession, message) {
                if (message.status_code !== 200) {
			log('ERROR:'+message.status_code);
                        return false;
                }
                let res = request.response_body.data;
                let resjsn = JSON.parse(res);
		let currentIntensity = resjsn.data[0].intensity.actual;
		log("Response: " + currentIntensity);
		label.set_text("CO₂: " + currentIntensity);
		let colour = getColor(scaleIntensity(currentIntensity, 100, 300));
		log(colour);
		label.set_style("color: " + colour + "; padding-top: 3px");
	});


	Mainloop.timeout_add_seconds(30, () => {
            updateUI();
        });

}

function scaleIntensity(intensity, minIntensity, maxIntensity) {
    let boundedIntensity = Math.max(Math.min(maxIntensity, intensity), minIntensity);
    log("BoundedIntensity: " + boundedIntensity);
    let scaledIntensity = (boundedIntensity - minIntensity) / (maxIntensity - minIntensity);
    log("ScaledIntensity: " + scaledIntensity);
    return scaledIntensity;
}

function getColor(value) {
    let r = value > 0.5 ? 255 : Math.floor(2 * value * 255);
    let g = value < 0.5 ? 255 : Math.floor(255-(2 * (value - 0.5) * 255));

    return 'rgb('+r+','+g+',0)';
}

// Compatibility with gnome-shell >= 3.32
if (SHELL_MINOR > 30) {
    ExampleIndicator = GObject.registerClass(
        {GTypeName: 'ExampleIndicator'},
        ExampleIndicator
    );
}

// We're going to declare `indicator` in the scope of the whole script so it can
// be accessed in both `enable()` and `disable()`
var indicator = null;


function init() {
    log(`initializing ${Me.metadata.name} version ${Me.metadata.version}`);

}

function enable() {
    log(`enabling ${Me.metadata.name} version ${Me.metadata.version}`);

    indicator = new ExampleIndicator();

    // The `main` import is an example of file that is mostly live instances of
    // objects, rather than reusable code. `Main.panel` is the actual panel you
    // see at the top of the screen.
    Main.panel.addToStatusArea(`${Me.metadata.name} Indicator`, indicator);
}


function disable() {
    log(`disabling ${Me.metadata.name} version ${Me.metadata.version}`);

    // REMINDER: It's required for extensions to clean up after themselves when
    // they are disabled. This is required for approval during review!
    if (indicator !== null) {
        indicator.destroy();
        indicator = null;
    }
}