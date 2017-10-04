(function ($) {

    // var baseEndpointUrl = "http://sharpcms-int2.sharp.com/components/remote.cfc?method=healthpostApiCall";
    var Enum = // the name of the "class"
        function () // this is what the arguments are passed to
        {
            var values = arguments; // get the varargs and save them
            var self = { // prepare a 'self' object to return
                all: [],     // list of all indices
                keys: values // list of all keys
            };

            for (var i = 0; i < values.length; i++) // for all enum names given
            {
                self[values[i]] = i;
                self.all[i] = i;
            }

            return self;
        };

    var layoutTypesEnum = Enum("fixed", "responsive");
    var timeFramesEnum = Enum("multiday", "rolling24")

    /***********************************************************
     *          Base HealthPost Widget
     ***********************************************************
     */
    $.widget('isd.healthPost', {

        /***********************************************************
         *          MATRIX OF OPTIONS
         *          timeFrame: 'multiday'(widgetLayout: 'fixed'/ 'responsive') / 'rolling24'
         *          collapseOption: true/false
         ***********************************************************
         */

        options: {
            providerId: null,
            providerLocationId: null,
            locationName: null,
            timeFrame: null,
            layoutType: null,
            collapseOption: null,
            canned: null
        },

        widgetEventPrefix: 'healthpost:',

        _create: function () {
            var self = this;
            this.availSlotsLocalData = [];
            this.clickCounter = 0;
            this.phoneNumber = "";
            this.startAsDate, this.endAsDate
            this.startDayIndex, this.endDayIndex
            this.matchedProvider = null;
            this.endTimeISO = "";
            this.locationName = "";
            this.processedNumberOfDays = 0;
            this.largestColumn = 0;
            this.dates = [];
            this.slotsOpened = false;
            this.hideSlotsStart = 0;
            this.slotCounterThreshold = 15;
            this.nextElementExists, this.previousElementExists = true;

            // dates/times params
            var daysValue, sameDayFlag;

            //  Block used for timeFrame = multiday
            if (timeFramesEnum[this.options.timeFrame] === timeFramesEnum.multiday) {

                this._setResponsiveNumberOfDays();
                var resizeTimer;
                $(window).on('resize', function (e) {
                    clearTimeout(resizeTimer);
                    resizeTimer = setTimeout(function () {
                        self._setResponsiveNumberOfDays();
                        self._availableSlotsDisplayProcessing();
                    }, 250);
                });

                // Create the main wrapper for the widget
                this.element.append("<div class='availability'><div class='time_slots table-responsive'><table class='table'><tbody><tr class='thead'></tr><tr class='tbody'></tr></tbody></table>");


                this.element.addClass('healthpost' + this.processedNumberOfDays + 'day').css({ "position": "relative" });
                // Event binding / handlers
                this._on(this.element, {
                    'click .slick-arrow': function (event) {
                        var curTarg = $(event.currentTarget);
                        curTarg.addClass("ui-state-disabled");
                        if (curTarg.hasClass('slick-next')) {
                            this._switchWeek('next');
                        }

                        else if (curTarg.hasClass('slick-prev')) {
                            this._switchWeek('prev');
                        }

                        if (curTarg.closest('.bottom-slots-nav').length) {
                            $("html, body").animate({
                                scrollTop: $("[id$='scheduling-widget']").offset().top
                            }, "fast");
                        }
                        return false;
                    }
                });

                if (this.options.collapseOption) {
                    this.hideSlotsStart = 4;
                    this._on({
                        'click .more-area': function (event) {
                            var hiddenTimeSlots = this.element.find('.time_slots.table-responsive li.time-item.hidden-time-slots');
                            var shown = this.element.find('.time_slots.table-responsive li.time-item.show');
                            var moreBtn = this.element.find('.time_slots.table-responsive li.more-trigger');

                            hiddenTimeSlots.removeClass('hidden-time-slots');
                            moreBtn.remove();
                            self.slotsOpened = true;
                            self._paginationSwitch();
                        }
                    });
                }
            }

            else if (timeFramesEnum[this.options.timeFrame] === timeFramesEnum.rolling24) {
                this.processedNumberOfDays = 2;

                // Create the wrapper for the widget
                this.element.append("<div class='availability time_slots'></div>");

                if (this.options.collapseOption) {
                    this.hideSlotsStart = 6;
                    this._on({
                        'click .more-area-rolling': function (event) {
                            var hiddenTimeSlots = this.element.find(".hidden-time-slots");
                            var moreBtn = this.element.find("ul[class*='inner-wrapper'] .more-area-rolling");

                            hiddenTimeSlots.addClass('show').removeClass('hidden-time-slots');
                            moreBtn.remove();
                            self.slotsOpened = true;
                        }
                    });
                }
            }

            this._super();

            // Get Appointments through HealthPost API
            this._prepGetAppointments();
        },

        _setResponsiveNumberOfDays: function () {

            if (window.matchMedia('screen and (min-width: 1025px)').matches) {
                if (layoutTypesEnum[this.options.layoutType] === layoutTypesEnum.fixed) {
                    this.processedNumberOfDays = 3;
                }
                else if (layoutTypesEnum[this.options.layoutType] === layoutTypesEnum.responsive) {
                    this.processedNumberOfDays = 7;
                }
            }
            if (window.matchMedia('screen and (min-width: 608px) and (max-width: 1024px)').matches) {
                if (layoutTypesEnum[this.options.layoutType] === layoutTypesEnum.fixed) {
                    this.processedNumberOfDays = 3;
                }
                else if (layoutTypesEnum[this.options.layoutType] === layoutTypesEnum.responsive) {
                    this.processedNumberOfDays = 5;
                }
            }
            if (window.matchMedia('screen and (max-width: 607px)').matches) {
                this.processedNumberOfDays = 2;
            }
        },

        _prepGetAppointments: function () {
            var availableSlotsData, availableSlotsData2;
            var endAsDate, endTimeISO, startTimeISO;
            var startAsDate = new Date();
            var multiDay;
            this.startDayIndex = 0;

            if (timeFramesEnum[this.options.timeFrame] == timeFramesEnum.multiday) {
                multiDay = true;
                // set up to get two weeks worth and set starDay and endDay indicies
                endAsDate = this._intoFuture(startAsDate, 6);

                var endDateTime2 = this._intoFuture(endAsDate, 7);
                var endTimeISO2 = endDateTime2.toISOString();

                var startDateTime2 = this._backInTime(endDateTime2, 6);
                var startTimeISO2 = startDateTime2.toISOString();
            }

            else if (timeFramesEnum[this.options.timeFrame] == timeFramesEnum.rolling24) {
                multiDay = false;
                endAsDate = this._intoFuture(startAsDate, this.processedNumberOfDays - 1);
            }

            var availableSlotsEndpoint = "availableslots";
            var providerInfoEndpoint = "providers";
            startTimeISO = startAsDate.toISOString();
            endTimeISO = endAsDate.toISOString();


            availableSlotsData = "provider\[\]=" + this.options.providerId + "," + this.options.providerLocationId + "&beginDateTime=" + startTimeISO + "&endDateTime=" + endTimeISO;

            availableSlotsData2 = multiDay ? "provider\[\]=" + this.options.providerId + "," + this.options.providerLocationId + "&beginDateTime=" + startTimeISO2 + "&endDateTime=" + endTimeISO2 : null;

            this._getAppointments(availableSlotsEndpoint, providerInfoEndpoint, availableSlotsData, availableSlotsData2, startTimeISO);
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

        _getAppointments: function (availableSlotsEndpoint, providerInfoEndpoint, availableSlotsData, availableSlotsData2, startTimeISO) {
            var self = this;
            var firstFullSlot;
            var baseEndpointAvailabilityUrl, baseEndpointAvailabilityUrl2, baseEndpointProvidersUrl, dataTypeProviders;

            self._controlAjaxLoader("show");
            var responseSuccess = true;

            // Testing data local xml / json - canned options dictates loading local data
            if (this.options.canned) {
                baseEndpointAvailabilityUrl = "/customcf/healthpost/stubbData/multidayOne.json";
                baseEndpointAvailabilityUrl2 = "/customcf/healthpost/stubbData/multidayTwo.json";
                baseEndpointProvidersUrl = "/customcf/healthpost/stubbData/providers.xml";
                dataTypeProviders = "xml";
            }
            else {
                baseEndpointAvailabilityUrl = baseEndpointAvailabilityUrl2 = baseEndpointProvidersUrl = "https://www.sharp.com/components/remote.cfc?method=healthpostApiCall";
                dataTypeProviders = "json";
            }

            $.when(
                $.ajax({
                    url: baseEndpointAvailabilityUrl,
                    dataType: 'json',
                    beforeSend: function (request) {
                        if (request) {
                            if (request.setRequestHeader) {
                                request.setRequestHeader("endpoint", availableSlotsEndpoint);
                                request.setRequestHeader("filters", availableSlotsData);
                            }
                        }
                    }
                }).fail(function (jqXHR, textStatus) {
                    self._injectDOM('api-error');
                }),
                $.ajax({
                    url: baseEndpointProvidersUrl,
                    dataType: dataTypeProviders,
                    beforeSend: function (request) {
                        if (request) {
                            if (request.setRequestHeader) {
                                request.setRequestHeader("endpoint", providerInfoEndpoint);
                            }
                        }
                    }
                }).fail(function (jqXHR, textStatus) {
                    self._injectDOM('api-error');
                }))
                .then(function (availability, providerList) {
                    if (availableSlotsData2 !== null) { // call twice if your widget has pagination - timeFrame === 'multiday'
                        $.ajax({
                            url: baseEndpointAvailabilityUrl2,
                            dataType: 'json',
                            beforeSend: function (request) {
                                if (request) {
                                    if (request.setRequestHeader) {
                                        request.setRequestHeader("endpoint", availableSlotsEndpoint);
                                        request.setRequestHeader("filters", availableSlotsData2);
                                    }
                                }
                            }
                        }).done(function (availability2) {

                            // check if the query has any errors
                            if (availability[0].hasOwnProperty('errors')) {
                                self._injectDOM('api-error');
                            }
                            else {
                                var a1 = availability[0]['availability'][0].providerSlots != null ? availability[0]['availability'][0].providerSlots : [];
                                var a2 = availability2['availability'][0].providerSlots != null ? availability2['availability'][0].providerSlots : [];
                                self.availSlotsLocalData = a1.concat(a2);

                                self.dates = self._generateDates(startTimeISO, 14);
                                var rawReformattedDates = self._reformatDates(self.dates, self.availSlotsLocalData);
                                rawReformattedDates.some(function (value, index, array) {
                                    firstFullSlot = index;
                                    return value.times.length > 0;
                                });

                                self.initialFormattedAS = rawReformattedDates.slice(firstFullSlot);

                                if (self.options.canned) {
                                    self._providerInfoQuery(providerList[2].responseXML);
                                }

                                else {
                                    self._providerInfoQuery(providerList[2].responseJSON);
                                }

                                self._availableSlotsDisplayProcessing();
                            }
                        }).fail(function (jqXHR, textStatus) {
                            self._injectDOM('api-error');
                        });
                    }
                    else {

                        // check if the query has any errors
                        if (availability[0].hasOwnProperty('errors') && availability2.hasOwnProperty('errors')) {
                            self._injectDOM('api-error');
                        }

                        else {
                            self.availSlotsLocalData = availability[0]['availability'][0].providerSlots != null ? availability[0]['availability'][0].providerSlots : [];

                            self.dates = self._generateDates(startTimeISO, 2);
                            var rawReformattedDates = self._reformatDates(self.dates, self.availSlotsLocalData);
                            rawReformattedDates.some(function (value, index, array) {
                                firstFullSlot = index;
                                return value.times.length > 0;
                            });

                            self.initialFormattedAS = rawReformattedDates.slice(firstFullSlot);

                            if (self.options.canned) {
                                self._providerInfoQuery(providerList[2].responseXML);
                            }
                            else {
                                self._providerInfoQuery(providerList[2].responseJSON);
                            }

                            self._availableSlotsDisplayProcessing();
                        }
                    }
                }, function () {
                    responseSuccess = false;
                });
        },

        _injectDOM: function (flag) {
            var self = this;

            // API call to Availability Service successful - proceed with DOM creation and manipulation
            // if (responseSuccess) {
            var hiddenClasses = "";
            var tooltipContent;
            var innerSlotCounter, outerSlotCounter = 0;
            var noTimesAvailable = this.element.find('.no-times-available');
            noTimesAvailable.remove();

            if (timeFramesEnum[this.options.timeFrame] === timeFramesEnum.multiday) {

                if (flag === 'api-error' || !this.initialFormattedAS.length) {
                    if (flag === 'api-error') {
                        this.element.find(".time_slots.table-responsive").append("<div class='no-times-available' style='text-align: center;'>There are no times currently available for online scheduling.</div>");
                    }

                    else {
                        if (this.phoneNumber != null || this.phoneNumber != "") {
                            var newTel1 = this.phoneNumber.replace(/[()]/g, "");
                            this.element.find(".time_slots.table-responsive").append("<div class='no-times-available' style='text-align: center;'>There are no times currently available for online scheduling. Please call <a href='tel:1-" + newTel1 + "'>" + newTel1 + "</a> to schedule.</div>");
                        }
                    }
                }

                else {
                    var nextWindow = this.initialFormattedAS.slice(this.endDayIndex + 1);
                    this.previousElementExists = this.initialFormattedAS.slice(0, this.startDayIndex).length ? true : false;

                    this.nextElementExists = nextWindow.some(function (element, index, array) {
                        return element.times.length;
                    });

                    var rawTableBody = this.element.find('table.table tbody');
                    var thead = this.element.find('table.table tr.thead');
                    var tbody = this.element.find('table.table tr.tbody');

                    var longestCounter = this.largestColumn;
                    this.slotCounterExceeded = longestCounter > self.hideSlotsStart ? true : false;

                    thead.empty();
                    tbody.empty();

                    // outer loop for days
                    $.each(self.reformattedAvailableSlots, function (outerIndex, slot) {
                        thead.append('<th><strong>' + self._friendlyDates(slot.day, 'EEE') + '</strong><br>' + self._friendlyDates(slot.day, 'MMM') + ' ' + self._friendlyDates(slot.day, 'dd') + '</th>');

                        tbody.append('<td><ul></ul></td>');
                        var firstUl = tbody.find("td").eq(outerIndex).find("ul:first-child");

                        // Check for if there are any slots
                        if (self.largestColumn) {
                            // Inner loop printing out times or dashes / ss-hypens
                            for (var index = 0; index < longestCounter; index++) {
                                var slotTime = slot.times[index];

                                // timeslots exist
                                if (slotTime != null) {

                                    var shortTime = self._friendlyDates(slotTime.localStartsAt, 'shortTime');
                                    var acceptableVisits = "";

                                    $.each(slotTime.acceptedReasonsForVisit, function (aRIndex, reason) {
                                        acceptableVisits += "<li>" + reason.name + "</li>";
                                    });

                                    tooltipContent = "<div class='slot_tooltip_content' id='slot_tooltip_content_23502536' style='display: none'><strong>" + slotTime.typeOfPatient.toUpperCase() + "</strong> patient can book for one of the following: <br><ul class='disc list_of_reason_for_visits'>" + acceptableVisits + "</ul></div>";

                                    // append timeslot

                                    firstUl.append("<li class='time-item'><a href='" + slotTime.bookingFormUrl + "' class='time-slot-" + self.locationName + "' data-ignore='push' rel='nofollow' target='_blank' title='click to make appointment'>" + shortTime + "</a>" + tooltipContent + "</li>");

                                    // wait to get to the last one, then hide and manipulate
                                    if (!self.slotsOpened && index == longestCounter - 1 && longestCounter > self.hideSlotsStart) {
                                        var dil = firstUl.children("li:gt(" + (self.hideSlotsStart - 2) + ")");
                                        dil.addClass('hidden-time-slots');
                                        firstUl.append("<li class='more-area more-trigger'><a class='more-label-" + self.locationName + "'>More</a></li>");

                                    }
                                }
                                // no timeslots (insert dashes / ss-hypens)
                                else {
                                    firstUl.append("<li class='time-item filler'><a class='ss-hyphen'></a></li>");

                                    if (!self.slotsOpened && index == longestCounter - 1 && longestCounter > self.hideSlotsStart) {
                                        var dil = firstUl.children("li:gt(" + (self.hideSlotsStart - 2) + ")");
                                        dil.addClass('hidden-time-slots');

                                        if (slot.times[self.hideSlotsStart - 1]) {
                                            firstUl.append("<li class='more-area more-trigger'><a class='more-label-" + self.locationName + "'>More</a></li>");
                                        }
                                        else {
                                            firstUl.append("<li class='time-item filler more-trigger'><a class='ss-hyphen'></a></li>");
                                        }
                                    }
                                }
                            }
                            // end slot loop
                        }

                        else {
                            firstUl.append("<li class='time-item filler'><a class='ss-hyphen'></a></li>");
                        }
                    });

                    // Default messaging for when there's no available time slots
                    if (!this.nextElementExists && (this.phoneNumber != null || this.phoneNumber != "")) {
                        var newTel1 = this.phoneNumber.replace(/[()]/g, "");
                        this.element.find(".time_slots.table-responsive").append("<div class='no-times-available' style='text-align: center;'>For additional availability, please call <a href='tel:1-" + newTel1 + "'>" + newTel1 + ".</a></div>");
                    }

                    this._paginationSwitch();
                }
            }

            else if (timeFramesEnum[this.options.timeFrame] === timeFramesEnum.rolling24) {
                var availability_slots_wrapper = this.element.find('.availability.time_slots');
                if (self.reformattedAvailableSlots.length) {
                    if (self.reformattedAvailableSlots[0].times.length || self.reformattedAvailableSlots[1].times.length) {
                        if (this.options.collapseOption) {
                            $.each(this.reformattedAvailableSlots, function (outerIndex, slot) {
                                innerSlotCounter = 0;

                                if (slot.times.length) {
                                    availability_slots_wrapper.append("<div class='time-item-div small-body'><strong>" + self._friendlyDates(slot.day, 'EEE') + ", " + self._friendlyDates(slot.day, 'MMM') + " " + self._friendlyDates(slot.day, 'dd') + "</strong></div>");

                                    availability_slots_wrapper.append("<ul class='row inner-wrapper'></ul>");
                                    outerSlotCounter += 1;
                                }

                                $.each(slot.times, function (i, time, array) {
                                    var totalItems = slot.times.length;
                                    innerSlotCounter += 1;
                                    var doo = ".inner-wrapper:eq(" + (outerSlotCounter - 1) + ")";
                                    var dil = availability_slots_wrapper.find(doo).append("<li class='time-item-rolling'><a href='" + time.bookingFormUrl + "' class='time-label time-slot-" + self.locationName + "' rel='nofollow' target='_blank' title='click to check in'>" + self._friendlyDates(time.localStartsAt, 'shortTime') + "</a></li>");

                                    if (!self.slotsOpened) {
                                        if (outerSlotCounter == 1) {
                                            if (totalItems > self.hideSlotsStart && innerSlotCounter % 3 === 0) {
                                                dil.find("li:eq(" + i + ")").addClass('endRow');
                                            }
                                            else if (totalItems <= self.hideSlotsStart) {
                                                if (innerSlotCounter % 3 === 0) {
                                                    dil.find("li:eq(" + i + ")").addClass('endRow');
                                                }
                                                else {
                                                    var tempTotal = totalItems > 1 ? totalItems - 1 : totalItems;
                                                    dil.find("li:eq(" + tempTotal + ")").addClass('endRow');
                                                }
                                            }
                                        }
                                        else if (outerSlotCounter == 2) {
                                            // add class to third item
                                            if (totalItems > 3 && innerSlotCounter % 3 === 0) {
                                                dil.find("li:eq(" + i + ")").addClass('endRow');
                                            }
                                        }
                                    }
                                });
                            });

                            var moreElement = availability_slots_wrapper.find('.endRow:eq(1)');
                            var timeItemList = $("li.time-item-rolling");
                            var innerWrapperList = availability_slots_wrapper.find(".inner-wrapper");
                            var liLast = $("li.time-item-rolling").index(moreElement);
                            moreElement.after("<div class='more-area-rolling'><a class='more-label-" + self.locationName + "'>See more times</a></div>");

                            if (innerWrapperList.length > 1 && innerWrapperList.first().find("li.time-item-rolling").length > 3) {
                                availability_slots_wrapper.find('div.time-item-div:eq(1)').addClass('hidden-time-slots');
                            }
                            timeItemList.filter(":gt(" + liLast + ")").addClass('hidden-time-slots');
                        }

                        else {
                            $.each(this.reformattedAvailableSlots, function (outerIndex, slot) {
                                availability_slots_wrapper.append("<div class='small-body time-item-div'><strong>" + self._friendlyDates(slot.day, 'EEE') + ", " + self._friendlyDates(slot.day, 'MMM') + " " + self._friendlyDates(slot.day, 'dd') + "</strong></div>");

                                availability_slots_wrapper.append("<ul class='row inner-wrapper" + outerIndex + "'></ul>");

                                $.each(slot.times, function (i, time) {
                                    availability_slots_wrapper.find('.row.inner-wrapper' + outerIndex).append("<li class='time-item-rolling'><a href='" + time.bookingFormUrl + "' class='time-label time-slot-" + self.locationName + "' rel='nofollow' target='_blank' title='click to check in'>" + self._friendlyDates(time.localStartsAt, 'shortTime') + "</a></li>");
                                });
                            });
                        }
                    }
                }
                else {
                    if (this.phoneNumber != null || this.phoneNumber != "") {
                        var newTel2 = this.phoneNumber.replace(/[()]/g, "");

                        availability_slots_wrapper.append("<div class='no-times-available' style='text-align: center;'>For additional availability, please call <a href='tel:1-" + newTel2 + "'>" + newTel2 + ".</a></div>");
                    }
                }
            }

            // Disabling Tooltip for now

            // $(".time-slot").tooltip({
            //     items: ".time-slot",
            //     content: function () {
            //         var element = $(this);
            //         if (element.is(".time-slot")) {
            //             return element.next().html();
            //         }
            //     }
            // });
            // }
        },

        _paginationSwitch: function () {

            var timeSlotsWrapperDOM = "<div class='time_slots_navigation_wraper'><div class='time_slots_navigation' style='position: relative'><button type='button' data-role='none' class='slick-prev slick-arrow' aria-label='Previous' role='button' style='display: block;'>Previous</button><button type='button' data-role='none' class='slick-next slick-arrow' aria-label='Next' role='button' style='display: block;'>Next</button></div></div>";
            var slotNavigationWrapper = this.element.find(".time_slots_navigation_wraper");

            slotNavigationWrapper.remove();

            this.element.find(".time_slots.table-responsive").prepend(timeSlotsWrapperDOM).find(".time_slots_navigation_wraper").addClass('top-slots-nav');

            if (this.largestColumn > this.slotCounterThreshold && this.slotsOpened) {
                // append
                this.element.append(timeSlotsWrapperDOM).find(".time_slots_navigation_wraper").eq(1).addClass('bottom-slots-nav');

            }

            if (!this.nextElementExists) {
                // remove next
                this.element.find('.time_slots_navigation button.slick-next').remove();
            }

            if (!this.previousElementExists) {
                // remove previous
                this.element.find('.time_slots_navigation button.slick-prev').remove();
            }
        },

        _availableSlotsDisplayProcessing: function () {
            var largestCol;
            this.endDayIndex = this.startDayIndex + (this.processedNumberOfDays - 1);

            this.reformattedAvailableSlots = this.initialFormattedAS.slice(this.startDayIndex, this.endDayIndex + 1);

            this.largestColumn = this.reformattedAvailableSlots.reduce(function (prevLarge, curLarge) {
                return (curLarge.times.length > prevLarge) ? curLarge.times.length : prevLarge;
            }, 0);

            this._injectDOM();
        },

        _switchWeek: function (direction) {
            var tmpStartIndex, tmpEndIndex;
            // need something to level set the switching of weeks
            if (direction === 'prev') {
                tmpStartIndex = this.startDayIndex - this.processedNumberOfDays;
                if (tmpStartIndex < 0) {
                    this.startDayIndex = 0;
                    this.endDayIndex = this.processedNumberOfDays - 1;
                }
                else {
                    this.startDayIndex -= this.processedNumberOfDays;
                    this.endDayIndex -= this.processedNumberOfDays;
                }
            }

            else if (direction === 'next') {
                tmpEndIndex = this.endDayIndex + this.processedNumberOfDays;

                if (tmpEndIndex > this.initialFormattedAS.length - 1) {
                    this.startDayIndex = this.initialFormattedAS.length - this.processedNumberOfDays;
                    this.endDayIndex = this.initialFormattedAS.length - 1;
                }
                else {
                    this.startDayIndex += this.processedNumberOfDays;
                    this.endDayIndex += this.processedNumberOfDays;
                }
            }

            this._availableSlotsDisplayProcessing();
        },

        _intoFuture: function (theDate, days) {
            // how to get to end of the day 
            // use clone to get around mutability problems!!!
            var cloneDateF = new Date(theDate.getTime());
            if (timeFramesEnum[this.options.timeFrame] !== timeFramesEnum.rolling24) {
                cloneDateF.setHours(23);
                cloneDateF.setMinutes(59);
                cloneDateF.setSeconds(59);
            }

            return new Date(cloneDateF.getTime() + (days * 24 * 60 * 60 * 1000));
        },

        _backInTime: function (theDate, days) {
            // how to get to the beginning of day
            var cloneDateP = new Date(theDate.getTime());
            if (timeFramesEnum[this.options.timeFrame] !== timeFramesEnum.rolling24) {
                cloneDateP.setHours(0);
                cloneDateP.setMinutes(0);
                cloneDateP.setSeconds(0);
            }

            return new Date(cloneDateP.getTime() - (days * 24 * 60 * 60 * 1000));
        },

        _generateDates: function (startDate, count) {

            var d = new Date(startDate),
                dates = [d];

            for (var i = 0; i < (count - 1); i++) {
                d = new Date(+d);
                d.setHours(d.getHours() + 24);
                dates.push(d);
            }
            return dates;
        },

        // Key generator
        _getDateKey: function (theDate) {
            var d = theDate.getDate();
            var m = theDate.getMonth() + 1;
            var y = theDate.getFullYear();
            var stringDate = y + '/' + ((m < 10 ? '0' : '') + m) + '/' + ((d < 10 ? '0' : '') + d);
            return stringDate;
        },

        // Key generator
        _getDayKey: function (theDate) {
            var day = theDate.getDay();
            return day;
        },

        _reformatDates: function (dates, rawAvailableSlots) {
            var self = this;
            var initialPush = false;
            //   // Data reformatting strategy taken from http://stackoverflow.com/questions/31890076/array-of-js-dates-how-to-group-by-days - RobG answer
            var reformattedAvailableSlots = dates.reduce(function (acc, d) {

                var dateKey = self._getDateKey(d);
                var dayKey = self._getDayKey(d);
                var matched = false;
                if (!initialPush) {
                    var tmp = {};
                    acc.push(tmp);
                }
                initialPush = true;

                //change up this logic - you want to included saturday and sunday, if they show timeslots!!!
                // only add rawAvailableSlots[i] if the localStartsAt is same day as d.....

                for (i = 0; i < rawAvailableSlots.length; i++) {

                    var tempAvSlotKey = self._getDateKey(new Date(rawAvailableSlots[i]['localStartsAt']));

                    if (dateKey == tempAvSlotKey) {
                        matched = true;
                        if (!acc[0].hasOwnProperty(tempAvSlotKey)) {

                            acc[0][tempAvSlotKey] = []; // if accum array does not have the an existing key, create a new one
                        }
                        acc[0][tempAvSlotKey].push(rawAvailableSlots[i]); // push the available slot object
                    }

                    if (matched == false) {
                        if (!acc[0].hasOwnProperty(dateKey)) {
                            acc[0][dateKey] = []; // if accum array does not have the an existing key, create a new one
                        }
                        acc[0][dateKey].push(); // push nothing since availableSlots do not exist for that date
                    }
                }
                return acc;
            }, []);

            var dil = reformattedAvailableSlots.reduce(function (acc, v) { // v is the keyed array from the first reduce
                Object.keys(v).forEach(function (k) {
                    return acc.push({ day: k, times: v[k] }); // reformat the acc array again, now adding the times array with avail times
                });
                return acc;
            }, []);

            return dil;

        },

        _friendlyDates: function (value, args) {
            // parse the date out....
            var months, days, formattedDay, paddedDay, outputTime;
            var dateInput = new Date(value);
            var inputYear = dateInput.getFullYear();
            var inputDate = dateInput.getDate();
            var inputMonth = dateInput.getMonth();
            var inputDay = dateInput.getDay();
            var inputHours = dateInput.getHours() > 12 ? dateInput.getHours() - 12 : dateInput.getHours();
            var am_pm = dateInput.getHours() >= 12 ? "PM" : "AM";
            inputHours = inputHours < 10 ? "0" + inputHours : inputHours;
            var inputMinutes = dateInput.getMinutes() < 10 ? "0" + dateInput.getMinutes() : dateInput.getMinutes();

            days = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];
            months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            formattedDay = days[inputDay];

            switch (args) {
                case "EEE":
                    outputValue = formattedDay;
                    break;
                case "MMM":
                    outputValue = months[inputMonth];
                    break;
                case "dd":
                    outputValue = inputDate;
                    break;
                case "shortTime":
                    outputTime = inputHours + ":" + inputMinutes + " " + am_pm;
                    outputTime = outputTime.replace(/00:(\d\d)\sAM/g, "12:$1 AM").replace(/^0+/, '');
                    outputValue = outputTime;
                    break;
                default:
                    break;
            }

            return outputValue;
        },

        _providerInfoQuery: function (responseJson) {
            var self = this;
            var parsedProviders;
            if (this.options.canned) {
                parsedProviders = responseJson;
            }

            else {
                parsedProviders = $.parseXML(responseJson); // Uncomment live endpoint
            }

            var $parsedProvidersXml = $(parsedProviders);
            this.matchedProvider = $parsedProvidersXml.find('providers provider').filter(function () {
                var matched = false;
                $(this).find('locations location').each(function () {
                    if ($(this).find('id').text() == self.options.providerLocationId) {
                        self.phoneNumber = $(this).find('phone').text().replace(/(\d\d\d)(\d\d\d)(\d\d\d\d)/, '($1)-$2-$3');
                        matched = true;
                    }
                });
                // Logic for displaying the location name - takes from 82 web first - if it fails, grabs the location from the API
                if (matched) {
                    var rawLocationTxt = self.options.locationName ? self.options.locationName : $(this).children('name').text();
                    var rawLocationTxtArray = rawLocationTxt.split(" ").map(function (value, index, array) {
                        return value.toLowerCase();
                    });
                    self.locationName = rawLocationTxtArray.join("-");
                }
                return matched;
            });

        },

        _controlAjaxLoader: function (showHide) {
            if (showHide === 'hide') {
                $('.ajax-loader-wrapper').hide();
            }
            else if (showHide === 'show') {
                $('.ajax-loader-wrapper').show();
            }
        },

        _destroy: function () {
            this.element.removeClass('healthpost-wrapper');
            this.element.empty();
            this._super();
        }
    });
})(jQuery);