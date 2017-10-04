(function ($) {
	/***********************************************************
	 *          Base Insurance Widget
	 ***********************************************************
	 */
	$.widget('web.insurancePromo', {
		options: {
			baseEndpoint: "",	// must be passed in
			soaProxy: "",		// must be passed in
			soaToken: "",		// must be passed in
			inputID: "items",	// id of the input field to attach autosuggest to
			inputMaxLength: 50,
			title: "Choosing health insurance for 2018?",
			description: "Make sure your plan includes doctors at Sharp."
		},

		_create: function () {
			var self = this;
			
			this.providerArray = [];

			// Event binding / handlers 
			this._on(this.document, {
				'submit#insurance-search': function (event) {
					var form = $(event.target);
					var typedText = form.find('#'+self.options.inputID).val();
					var errorDiv = form.find('#insurance-search-error');

					var topSuggestion = $('ul.ui-autocomplete:visible > li:first');
					if ( typedText.toLowerCase() == topSuggestion.text().toLowerCase() ) {
						topSuggestion.click();
					}
					else {
						$('#'+self.options.inputID).autocomplete('close');
						errorDiv.append("Please enter the full name of your insurance.");
					}
					return false;
				}
			});

			this._on(this.document, {
				'click#check-insurance-link': function(event) {
					self._showSearchScreen();
					return false;
				}
			});
			
			// show search screen
			this._showSearchScreen();

			this._super();
		},

		_autoSuggest: function () {
			var self = this;

			$('#'+self.options.inputID).autocomplete({
				source: function (request, response) {
					var searchTerm = request.term;

					$.ajax({
						// need to escape certain characters - much like the FAD instance
						url: self.options.soaProxy,
						dataType: 'json',
						beforeSend: function (request) {
							if (request) {
								if (request.setRequestHeader) {
									self.element.find('#insurance-search-error').html('');
									request.setRequestHeader("endpoint", self.options.baseEndpoint + encodeURI(searchTerm));
									request.setRequestHeader("access-token", self.options.soaToken);
								}
							}
						},
						success: function (data) {
							self.providerArray = data;
							var dropDown = $.map(data, function (item) {
								return {
									id: item.providerID,
									label: item.provider,
									value: item.provider
								};
							});
							response(dropDown);
						},
						error: function (data) {
							alert('endpoint search error');
						}
					});
				},
				minLength: 2,
				select: function (event, ui) {
					self._showProviderScreen(ui.item.id);
				}
			});
		},

		// Important - only used when calling the widget and changing the options after initialization
		_setOption: function (key, value) {
			var self = this,
				prev = this.options[key];

			// base
			this._super(key, value);
		},

		_setOptions: function (options) {
			this._super(options);
			this.refresh();
		},

		_showSearchScreen: function () {
			// clear existing screen and initialize new screen
			this.element.find('.insurance-screen').remove();
			this.element.append("<div id='search-screen' class='insurance-screen'></div>");
			
			var screen = this.element.find('.insurance-screen');

			screen.append("<div class='row'><div class='twelve columns offset-two'><h1>" + this.options.title + "</h1><h2>" + this.options.description + "</h2></div></div>");
			screen.append("<div class='row'><div class='six columns offset-five six-medium offset-one-medium'><p><form id='insurance-search'><label class='small-eyebrow' for='items'>Name of insurance</label><br><input type='text' id='items' maxlength='"+this.options.inputMaxLength+"'><div id='insurance-search-error' class='error'></div></form></p></div></div>");
			screen.append("<div class='row'><div class='twelve columns offset-two'><p>Need insurance? You can purchase private health insurance from <a id='insurance-tips-link' href='/health-insurance/i-need-to-buy-insurance.cfm'>Sharp Health Plan</a> or through <a id='covered-california-link' href='/health-insurance/covered-california.cfm'>Covered California</a>.</p></div></div>");
			screen.append("<div class='row'><div class='twelve columns offset-two'><p>Questions? Call <a class='insurance-promo-82sharp-link' href='tel:+18008274277'>1-800-82-SHARP</a>.</p></div></div>");

			this._autoSuggest();
		},

		_showProviderScreen: function ( providerID ) {
			var self = this;

			// clear existing screen and initialize new screen
			this.element.find('.insurance-screen').remove();
			this.element.append("<div id='provider-screen' class='insurance-screen'></div>");

			var screen = this.element.find('.insurance-screen');
			var provider;
			var determiner;         // a/an
			var planList;
			// set default flags
			var notAccepted = false;
			var noDoctors = true;

			// get the selected provider
			$.each(self.providerArray, function ( i, val ){
				if ( providerID == self.providerArray[i].providerID ) {
					provider = self.providerArray[i];
					return false;   // break loop
				}
			});

			// use 'an' or 'a' depending on whether the provider name begins with a vowel or not
			determiner = /^[aeiouAEIOU]/.test(provider.provider) ? 'an' : 'a';

			// check if notAccepted
			if ( provider.BL == 1 ) {
				notAccepted = true;
			}

			// check if it has any active doctors in any of its plans
			$.each(provider.insurancePlans, function (i, item, array) {
				if ( item.hasDoctors > 0 ) {
					noDoctors = false;
					return false;   // break loop
				}
			});

			if ( notAccepted ) {
				GAEvent('Insurance', 'Promo - Provider not accepted', provider.provider);
				screen.append("<div class='row'><div class='twelve columns offset-two'><h1>Sharp does not accept " + provider.provider + " insurance</h1><h2>If you select Kaiser insurance during open enrollment, you will not be able to see Sharp-affiliated doctors in 2018.</h2><h2>Check another type of insurance</h2></div></div>");
				screen.append("<div class='row'><div class='six columns offset-five'><p><form id='insurance-search'><label class='small-eyebrow' for='items'>Name of insurance</label><br><input type='text' id='items' maxlength='"+this.options.inputMaxLength+"'><div id='insurance-search-error' class='error'></div></form></p></div></div>");
				screen.append("<div class='row'><div class='twelve columns offset-two'><p><a id='all-insurances-link' href='/health-insurance/health-insurance-plans.cfm'>See a list of all insurances accepted by Sharp.</a></p></div></div>");
				screen.append("<div class='row'><div class='twelve columns offset-two'><p>Questions? Call <a class='insurance-promo-82sharp-link' href='tel:+18008274277'>1-800-82-SHARP</a>.</p>");

				this._autoSuggest();
			}
			else if ( noDoctors ) {
				GAEvent('Insurance', 'Promo - Provider no doctors', provider.provider);
				screen.append("<div class='row'><div class='twelve columns offset-two'><h1>Sharp accepts this insurance</h1><h2>For help finding doctors at Sharp who accept this insurance, please call <a class='insurance-promo-82sharp-link' href='tel:+18008274277'>1-800-82-SHARP</a> (<a class='insurance-promo-82sharp-link' href='tel:+18008274277'>1-800-827-4277</a>), Monday through Friday, 7 am to 7 pm.</h2></div></div>");
				screen.append("<div class='row'><div class='six columns offset-five'><p><form id='insurance-search'><label class='small-eyebrow' for='items'>Name of insurance</label><br><input type='text' id='items' maxlength='"+this.options.inputMaxLength+"'><div id='insurance-search-error' class='error'></div></form></p></div></div>");
				screen.append("<div class='row'><div class='twelve columns offset-two'><p><a id='all-insurances-link' href='/health-insurance/health-insurance-plans.cfm'>See a list of all insurances accepted by Sharp.</a></p></div></div>");
				screen.append("<div class='row'><div class='twelve columns offset-two'><p>Questions? Call <a class='insurance-promo-82sharp-link' href='tel:+18008274277'>1-800-82-SHARP</a>.</p>");

				this._autoSuggest();
			}
			else {
				// if there's a single plan that matches the provider name, send them straight to FAD results
				if ( provider.insurancePlans.length == 1 && provider.provider == provider.insurancePlans[0].InsurancePlan ) {
					GAEvent('Insurance', 'Promo - Provider', provider.provider);
					window.location = '/san-diego-doctors/search?i=' + provider.insurancePlans[0].InsurancePlanID;
				}
				else {
					//
					GAEvent('Insurance', 'Promo - Provider', provider.provider);
					screen.append("<div class='row'><div class='twelve columns offset-two'><h1>Sharp accepts " + provider.provider + " insurance</h1><h2>Choose " + determiner + " " + provider.provider + " plan below to view doctors who accept that insurance.</h2></div></div>");
					if ( provider.insurancePlans.length > 7 ) {
						screen.append("<div class='row'><div class='ten columns offset-four six-medium offset-one-medium'><div class='insurance-plans'></div></div></div>");
					}
					else {
						screen.append("<div class='row'><div class='ten columns offset-three'><div class='insurance-plans'></div></div></div>");
					}
					if ( provider.url.length ) {
						screen.append("<div class='row'><div class='twelve columns offset-two'><h2>Don't see your plan?</h2><p><a class='provider-site-link' target='_blank' rel='nofollow' href='" + provider.url + "'>Contact " + provider.provider + "</a> to find out if your plan is accepted by Sharp.</p></div></div>");
					}
					else {
						screen.append("<div class='row'><div class='twelve columns offset-two'><h2>Don't see your plan?</h2><p>Contact " + provider.provider + " to find out if your plan is accepted by Sharp.</p></div></div>");
					}
					
					screen.append("<div class='row'><div class='twelve columns offset-two'><p><a id='check-insurance-link'>Check a different insurance plan.</a></p></div></div>");

					listDiv = screen.find(".insurance-plans");
					this._displayInsurancePlans(listDiv, provider.provider, provider.insurancePlans);
				}
			}
		},

		_displayInsurancePlans: function (listDiv, provider, plans) {
			var i;
			var currentList;

			if (plans.length > 7) {
				// split into evenly weighted columns
				var halfway = Math.ceil(plans.length / 2);

				listDiv.append("<ul class='insurance-plan-list list-one'>");
				listDiv.append("<ul class='insurance-plan-list list-two'>");

				currentList = $(listDiv).find('.list-one');

				for (i = 0; i < halfway; i++) {
					currentList.append("<li><a class='insurance-plan-fad-link' data-analytics-label='" + provider + "' href='/san-diego-doctors/search?i=" + plans[i].InsurancePlanID + "'>" + plans[i].InsurancePlan + "</a></li>");
				}

				currentList = $(listDiv).find('.list-two');

				for (i = halfway; i < plans.length; i++) {
					currentList.append("<li><a class='insurance-plan-fad-link' data-analytics-label='" + provider + "' href='/san-diego-doctors/search?i=" + plans[i].InsurancePlanID + "'>" + plans[i].InsurancePlan + "</a></li>");
				}
			}
			else {
				listDiv.append("<ul class='insurance-plan-list'>");

				currentList = $(listDiv).find('.insurance-plan-list');

				for (i = 0; i < plans.length; i++) {
					currentList.append("<li><a class='insurance-plan-fad-link' data-analytics-label='" + provider + "' href='/san-diego-doctors/search?i=" + plans[i].InsurancePlanID + "'>" + plans[i].InsurancePlan + "</a></li>");
				}
			}
		},

		_destroy: function () {
			this.element.empty();
			this._super();
		}
	});
})(jQuery);