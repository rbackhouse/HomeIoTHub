/*
* The MIT License (MIT)
* 
* Copyright (c) 2016 Richard Backhouse
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
* to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
* and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
* DEALINGS IN THE SOFTWARE.
*/

require.config({
	baseUrl: 'js/',
	paths: {
		jquery: '//ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min',
		jquerymobile: '//ajax.googleapis.com/ajax/libs/jquerymobile/1.4.5/jquery.mobile.min',
		underscore: '//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min',
		backbone: '//cdnjs.cloudflare.com/ajax/libs/backbone.js/1.3.3/backbone-min',
		q: '//cdnjs.cloudflare.com/ajax/libs/q.js/1.4.1/q.min',
		text: '//cdnjs.cloudflare.com/ajax/libs/require-text/2.0.12/text.min',
		templates: '../templates'
	}
});

require(['app']);
