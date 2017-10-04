(function ($) {
	/***********************************************************
	 *          Base Insurance Widget
	 ***********************************************************
	 */
    $.widget('web.fadWizard', {
        options: {
            test: ""
        },

        _create: function () {
            var self = this;
            this.baseView = this._baseView();
            this.searchModel = {};
            this.element.append(this.baseView);
            this.wizardWrapper = this.element.find(".wizard-wrapper");
            this.wizardStep = 1;


            // Event binding / handlers
            this._on(this.element, {
                'click .wiz-button': function (event) {
                    this._pushSearchModel();

                    this.wizardStep++;
                    self.wizardWrapper.empty();
                    self._renderView();

                    // advance to next view
                    return false;
                }
            });



            // show search screen
            this._renderView();

            this._super();
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


        _clearView: function () {

        },

        _pushSearchModel: function () {
            var check = this.element.find('form.active-wiz-form').length;

            if (check) {
                var selValue = this.element.find('form.active-wiz-form input[name=wiz]:checked').val();
                this.searchModel.location = selValue;
            }
        },

        _renderView: function () {
            var viewHtml;
            switch (this.wizardStep) {
                case 1:
                    viewHtml = this._landingView();
                    break;
                case 2:
                    viewHtml = this._workHomeView();
                    break;
                case 3:
                    viewHtml = this._zipView();
                    break;
                case 4:
                    viewHtml = this._genderView();
                    break;
                case 5:
                    viewHtml = this._healthConcernView();
                    break;
                default:
                    break;
            }

            this.wizardWrapper.append(viewHtml);
        },

        _baseView: function () {
            var strVar = "";
            strVar += "    <div class=\"container full wizard-wrapper\"\>";
            strVar += "        <div class=\"row\">";
            strVar += "            <div class=\"sixteen columns\">";
            strVar += "                <div class=\"container\">";
            strVar += "                    <div class=\"row\">";
            strVar += "                    <\/div>";
            strVar += "                <\/div>";
            strVar += "            <\/div>";
            strVar += "        <\/div>";
            strVar += "        <\/div>";
            return strVar;
        },

        _landingView: function () {
            var strVar = "";
            strVar += "                        <div class=\"sixteen columns hero-cta text-center\">";
            strVar += "                            <div class=\"row\">";
            strVar += "                                <div class=\"eight columns offset-four six-medium offset-one-medium\">";
            strVar += "                                    <div class=\"truss\">";
            strVar += "                                        <img class=\"every-moment-matters-logo\" src=\"https:\/\/images.sharp.com\/com\/logos\/emm-logo-817.png\" alt=\"Every Moment Matters\" title=\"Every Moment Matters\">";
            strVar += "                                    <\/div>";
            strVar += "                                <\/div>";
            strVar += "                                <div class=\"twelve columns offset-two eight-medium offset-none-medium\">";
            strVar += "                                    <div class=\"truss\">";
            strVar += "                                        <h6>Find the right doctor for you.<\/h6>";
            strVar += "                                    <\/div>";
            strVar += "                                    <div class=\"truss\">";
            strVar += "                                        <p>At Sharp we believe every moment matters......<\/p>";
            strVar += "                                    <\/div>";
            strVar += "                                <\/div>";
            strVar += "                                <div class=\"four columns offset-six four-medium offset-two-medium six-small offset-one-small\">";
            strVar += "                                    <div class=\"truss\">";
            strVar += "                                        <a id=\"\" class=\"wiz-button full-width text-center\">Get Started<\/a>";
            strVar += "                                    <\/div>";
            strVar += "                                <\/div>";
            strVar += "                            <\/div>";
            strVar += "                        <\/div>";

            return strVar;
        },

        _workHomeView: function () {
            var strVar = "";

            var strVar = "";


            strVar += "                     <div class=\"four columns offset-six four-medium offset-two-medium six-small offset-one-small\">";
            strVar += "                     <div class=\"truss\">";
            strVar += "                         <form class=\"active-wiz-form\" action=\"\">";
            strVar += "                             <input type=\"radio\" name=\"wiz\" value=\"home\"> Home<br>";
            strVar += "                             <input type=\"radio\" name=\"wiz\" value=\"work\"> Work<br>";
            strVar += "                         <\/form>";
            strVar += "                     <\/div>";
            strVar += "                     <div class=\"truss\">";
            strVar += "                            <a id=\"\" class=\"wiz-button full-width text-center\">Get Started<\/a>";
            strVar += "                     <\/div>";
            strVar += "                     <\/div>";

            return strVar;
        },

        _zipView: function () {
            var strVar = "";

            strVar += "                     <h2>Zip View</h2>";
            strVar += "                                <div class=\"four columns offset-six four-medium offset-two-medium six-small offset-one-small\">";
            strVar += "                                    <div class=\"truss\">";
            strVar += "                                        <a id=\"\" class=\"wiz-button full-width text-center\">Get Started<\/a>";
            strVar += "                                    <\/div>";
            strVar += "                                <\/div>";

            return strVar;
        },

        _genderView: function () {
            var strVar = "";

            strVar += "                     <h2>Gender View</h2>";
            strVar += "                                <div class=\"four columns offset-six four-medium offset-two-medium six-small offset-one-small\">";
            strVar += "                                    <div class=\"truss\">";
            strVar += "                                        <a id=\"\" class=\"wiz-button full-width text-center\">Get Started<\/a>";
            strVar += "                                    <\/div>";
            strVar += "                                <\/div>";

            return strVar;
        },

        _healthConcernView: function () {
            var strVar = "";
            strVar += "                     <h2> Health concern View</h2>";
            strVar += "                                <div class=\"four columns offset-six four-medium offset-two-medium six-small offset-one-small\">";
            strVar += "                                    <div class=\"truss\">";
            strVar += "                                        <a id=\"\" class=\"wiz-button full-width text-center\">Get Started<\/a>";
            strVar += "                                    <\/div>";
            strVar += "                                <\/div>";

            return strVar;
        },

        _destroy: function () {
            this.element.empty();
            this._super();
        }
    });
})(jQuery);