/*
Fōrmulæ typesetting package. Module for expression definition & visualization.
Copyright (C) 2015-2023 Laurence R. Ugalde

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

'use strict';

export class Typesetting extends Formulae.Package {}

Typesetting.Rectangles = class {
	constructor() {
		this.minLine = 0;
		this.maxLine = 0;
	}

	clone() {
		let newRectangles = { minLine: this.minLine, maxLine: this.maxLine, clone: this.clone };

		for (let l = this.minLine, L = this.maxLine; l <= L; ++l) {
			newRectangles[l] = new Rectangle(this[l].x, this[l].y, this[l].width, this[l].height);
		}

		return newRectangles;
	}
};

Typesetting.Chunk = class {
	constructor() {
		this.startLine = 0;
		this.startToken = 0;

		this.endLine = 0;
		this.endToken = 0;
		this.endTokenWidth = null;

		this.expression = null;
		this.fontSize = 0;
	}	
}

Typesetting.Token = class {
	constructor(object) {
		this.object = object;
		this.x = null;
	}
};

Typesetting.FormattingToken = class {
	constructor(type, value) {
		this.type = type;
		this.value = value;
		this.bkp = null;
	}

	setFormat(context) {
		switch (this.type) {
			case Typesetting.FormattingToken.SET_BOLD:
			case Typesetting.FormattingToken.TURN_BOLD:
				this.bkp = context.fontInfo.bold;
				break;

			case Typesetting.FormattingToken.SET_ITALIC:
			case Typesetting.FormattingToken.TURN_ITALIC:
				this.bkp = context.fontInfo.italic;
				break;

			case Typesetting.FormattingToken.SET_COLOR:
				this.bkp = context.fillStyle;
				break;
		}

		switch (this.type) {
			case Typesetting.FormattingToken.SET_BOLD:    context.fontInfo.setBold(context, this.value); break;
			case Typesetting.FormattingToken.TURN_BOLD:   context.fontInfo.setBold(context, !context.fontInfo.bold); break;
			case Typesetting.FormattingToken.SET_ITALIC:  context.fontInfo.setItalic(context, this.value); break;
			case Typesetting.FormattingToken.TURN_ITALIC: context.fontInfo.setItalic(context, !context.fontInfo.italic); break;
			case Typesetting.FormattingToken.SET_COLOR:   context.fillStyle = this.value; break;
		}
	};

	restoreFormat(context) {
		switch (this.type) {
			case Typesetting.FormattingToken.SET_BOLD:
			case Typesetting.FormattingToken.TURN_BOLD:
				context.fontInfo.setBold(context, this.bkp);
				break;

			case Typesetting.FormattingToken.SET_ITALIC:
			case Typesetting.FormattingToken.TURN_ITALIC:
				context.fontInfo.setItalic(context, this.bkp);
				break;

			case Typesetting.FormattingToken.SET_COLOR:
				context.fillStyle = this.bkp;
				break;
		}
	};
};

Typesetting.FormattingToken.SET_BOLD    = 1;
Typesetting.FormattingToken.TURN_BOLD   = 2;
Typesetting.FormattingToken.SET_ITALIC  = 3;
Typesetting.FormattingToken.TURN_ITALIC = 4;
Typesetting.FormattingToken.SET_COLOR   = 5;

Typesetting.RestoringToken = class {
	constructor(formattingToken) {
		this.formattingToken = formattingToken;
	}

	restoreFormat(context) {
		this.formattingToken.restoreFormat(context);
	}
};

Typesetting.Line = class {
	constructor() {
		this.tokens = [];
		this.horzBaseline = 0;
		this.maxSemiHeight = 0;
		this.width = 0;
	}
};

Typesetting.Paragraph = class {
	constructor(context, pretendedWidth, n) {
		this.lines = [ new Typesetting.Line() ];
		this.currentLine = 0;
		this.numTokensInCurrentLine = 0;

		this.context = context;
		this.pretendedWidth = pretendedWidth;
		this.accumulatedWidth = 0;
		this.lastSemiSpace = context.fontInfo.semiSpace;

		this.chunks = [ ];
	}

	appendExpression(expression) {
		switch (expression.getTag()) {
			//case "String.String":
			case "String.Text":
				this.appendTokens(expression.get("Value").split(/\s+/), expression);
				break;

			case "Internet.UniformResourceLocator": {
					let formatter = new Typesetting.FormattingToken(Typesetting.FormattingToken.SET_COLOR, "green");
					this.lines[this.currentLine].tokens.push(formatter);

					this.appendTokens(expression.get("Description").split(/\s+/), expression);

					this.lines[this.currentLine].tokens.push(new Typesetting.RestoringToken(formatter));
				}
				break;

			case "Typesetting.BoldChunk": {
					let formatter = new Typesetting.FormattingToken(Typesetting.FormattingToken.TURN_BOLD, null);
					this.lines[this.currentLine].tokens.push(formatter);
					// the format must actually change, in order that the widths can be appropriately calculated
					formatter.setFormat(this.context);

					for (let i = 0, n = expression.children.length; i < n; ++i) {
						this.appendExpression(expression.children[i]);
					}

					this.lines[this.currentLine].tokens.push(new Typesetting.RestoringToken(formatter));
					// restoring format
					formatter.restoreFormat(this.context);
				}
				break;

			case "Typesetting.ItalicChunk": {
					let formatter = new Typesetting.FormattingToken(Typesetting.FormattingToken.TURN_ITALIC, null);
					this.lines[this.currentLine].tokens.push(formatter);
					// the format must actually change, in order that the widths can be appropriately calculated
					formatter.setFormat(this.context);

					for (let i = 0, n = expression.children.length; i < n; ++i) {
						this.appendExpression(expression.children[i]);
					}

					this.lines[this.currentLine].tokens.push(new Typesetting.RestoringToken(formatter));
					// restoring format
					formatter.restoreFormat(this.context);
				}
				break;

			case "Typesetting.ColorChunk": {
					let formatter = new Typesetting.FormattingToken(Typesetting.FormattingToken.SET_COLOR, "blue");
					this.lines[this.currentLine].tokens.push(formatter);

					for (let i = 0, n = expression.children.length; i < n; ++i) {
						this.appendExpression(expression.children[i]);
					}

					this.lines[this.currentLine].tokens.push(new Typesetting.RestoringToken(formatter));
				}
				break;

			default: { // expression
				expression.prepareDisplay(this.context);
				this.appendTokens([ expression ], expression);
			}
		}

		expression.rectangles = null;
	}

	appendTokens(array, expression) {
		let line = this.lines[this.currentLine];
		let tokenWidth;
		let token;
		let o;
		let chunk = new Typesetting.Chunk();

		for (let i = 0, n = array.length; i < n; ++i) {
			o = array[i];

			token = new Typesetting.Token(o);

			// token width
			if (o instanceof Expression) {
				tokenWidth = o.width;
			}
			else {
				tokenWidth = this.context.measureText(o).width;
			}

			if (this.numTokensInCurrentLine == 0) {
				token.x = 0;
			}
			else {
				// does it exceed the pretended width ?

				if (line.width + this.lastSemiSpace + this.context.fontInfo.semiSpace + tokenWidth > this.pretendedWidth) {
					if (this.numTokensInCurrentLine > 1) {
						let extra = (this.pretendedWidth - line.width);
						line.width += extra;
						extra /= this.numTokensInCurrentLine - 1;

						for (let t = 0, i = 0, n = line.tokens.length; i < n; ++i) {
							if (line.tokens[i] instanceof Typesetting.FormattingToken || line.tokens[i] instanceof Typesetting.RestoringToken) {
								continue;
							}
	
							if (t > 0) {
								line.tokens[i].x += t * extra;
							}

							++t;
						}
					}

					////////////////////////////

					line = new Typesetting.Line();
					this.lines.push(line);
					++this.currentLine;
					this.numTokensInCurrentLine = 0;
				}

				if (this.numTokensInCurrentLine > 0) {
					line.width += this.lastSemiSpace + this.context.fontInfo.semiSpace;
				}

				token.x = line.width;
			}

			line.tokens.push(token);
			line.width += tokenWidth;

			if (this.numTokensInCurrentLine == 0) {
				if (o instanceof Expression) {
					line.horzBaseline = o.horzBaseline;
					line.maxSemiHeight = o.height - o.horzBaseline;
				}
				else {
					line.horzBaseline = line.maxSemiHeight = this.context.fontInfo.semiHeight;
				}
			}

			++this.numTokensInCurrentLine;

			if (i == 0) {
				chunk.startLine = this.currentLine;
				chunk.startToken = line.tokens.length - 1;
				chunk.expression = expression;
				chunk.fontSize = this.context.fontInfo.size;

				this.chunks.push(chunk);

				if (o instanceof Expression) {
					if (o.horzBaseline > line.horzBaseline) line.horzBaseline = o.horzBaseline;
					if (o.height - o.horzBaseline > line.maxSemiHeight) line.maxSemiHeight = o.height - o.horzBaseline;
				}
				else {
					token.width = tokenWidth;

					if (this.context.fontInfo.semiHeight > line.horzBaseline) line.horzBaseline = this.context.fontInfo.semiHeight;
					if (this.context.fontInfo.semiHeight > line.maxSemiHeight) line.maxSemiHeight = this.context.fontInfo.semiHeight;
				}
			}
		} // for array

		chunk.endLine = this.currentLine;
		chunk.endToken = line.tokens.length - 1;
		chunk.endTokenWidth = tokenWidth;

		this.lastSemiSpace = this.context.fontInfo.semiSpace;
	}

	postProcess(paragraphExpression) {
		let line;
		let token;
		let width = 0, height = 0;

		for (let l = 0, L = this.lines.length; l < L; ++l) {
			line = this.lines[l];

			if (line.width > width) width = line.width;

			////

			if (l > 0) height += 5;

			height += line.horzBaseline;
			line.horzBaseline = height;
			height += line.maxSemiHeight;
		}

		paragraphExpression.width = Math.round(width);
		paragraphExpression.height = Math.round(height);
		paragraphExpression.vertBaseline = Math.round(width / 2);
		paragraphExpression.horzBaseline = this.lines[0].horzBaseline;
	}

	createRectangles(paragraphExpression, offsetX, offsetY) {
		let rectangles;
		let chunk;
		let x, y;
		let expression;
		let line;
		let width, height;

		for (let ch = 0, CH = this.chunks.length; ch < CH; ++ch) {
			chunk = this.chunks[ch];

			rectangles = new Typesetting.Rectangles();
			rectangles.minLine = chunk.startLine;
			rectangles.maxLine = chunk.endLine;

			expression = chunk.expression;
			expression.rectangles = rectangles;

			for (let l = chunk.startLine, L = chunk.endLine; l <= L; ++l) {
				line = this.lines[l];

				if (l == chunk.startLine) {
					x = Math.floor(line.tokens[chunk.startToken].x);
				}
				else {
					x = 0;
				}

				if (l == chunk.endLine) {
					width = Math.floor(line.tokens[chunk.endToken].x + chunk.endTokenWidth) - x;
				}
				else {
					width = Math.floor(line.width) - x;
				}

				switch (expression.getTag()) {
					//case "String.String":
					case "String.Text":
					case "Internet.UniformResourceLocator":
						y = Math.floor(line.horzBaseline - chunk.fontSize / 2);
						height = Math.floor(chunk.fontSize);
						break;

					default:
						y = Math.floor(line.horzBaseline) - expression.horzBaseline;
						height = expression.height;
						expression.x = x;
						expression.y = y;
				}

				rectangles[l] = new Rectangle(x + offsetX, y + offsetY, width, height);
			}
		}

		paragraphExpression.rectangles = null;
		this._createMissingRectangles(paragraphExpression);
	}

	_createMissingRectangles(expr) {
		if (expr.rectangles === undefined || expr.rectangles == null) {
			let child;
			let rectangles = null, anotherRectangles;

			for (let i = 0, n = expr.children.length; i < n; ++i) {
				child = expr.children[i];

				if (rectangles == null) {
					rectangles = this._createMissingRectangles(child).clone();
				}
				else {
					anotherRectangles = this._createMissingRectangles(child);

					for (let l = anotherRectangles.minLine, L = anotherRectangles.maxLine; l <= L; ++l) {
						if (rectangles[l] === undefined) {
							rectangles[l] = new Rectangle(anotherRectangles[l].x, anotherRectangles[l].y, anotherRectangles[l].width, anotherRectangles[l].height);
							if (l < rectangles.minLine) rectangles.minLine = l;
							if (l > rectangles.maxLine) rectangles.maxLine = l;
						}
						else {
							let maxX = Math.max(rectangles[l].x + rectangles[l].width,  anotherRectangles[l].x + anotherRectangles[l].width );
							let maxY = Math.max(rectangles[l].y + rectangles[l].height, anotherRectangles[l].y + anotherRectangles[l].height);

							rectangles[l].x = Math.min(rectangles[l].x, anotherRectangles[l].x);
							rectangles[l].y = Math.min(rectangles[l].y, anotherRectangles[l].y);

							rectangles[l].width  = maxX - rectangles[l].x;
							rectangles[l].height = maxY - rectangles[l].y;
						}
					}
				}
			}

			expr.rectangles = rectangles;
		}

		return expr.rectangles;
	}
};

//////////////////////////
// Formulae expressions //
//////////////////////////

Typesetting.ParagraphExpression = class extends Expression {
	constructor() {
		super();
		this.paragraph = null;
		this.color = "red";
	}

	getTag() { return "Typesetting.Paragraph"; }
	getName() { return Typesetting.messages["nameParagraph"]; }
	canHaveChildren(count) { return count > 0; }
	getMnemonic() { return Typesetting.messages["mnemonicParagraph"]; }

	isChildAbsolutePositioning(i) {
		return true;
	}

	//isAbsolutePositioning() {
	//	return true;
	//}

	isChildShapedByChunks(i) {
		return this.isValid();
	}
	
	isValid() {
		if (this.parent instanceof ExpressionHandler) return true;

		switch (this.parent.getTag()) {
			case "Typesetting.MultiParagraph":
			case "Typesetting.BulletedList":
				return true;
		}
		
		return false;
	}

	prepareDisplay(context) {
		if (!this.isValid()) {
			this.prepareDisplayAsFunction(context);
			return;
		}
		
		this.level = this.parent.level === undefined ? 0 : this.parent.level;

		this.paragraph = new Typesetting.Paragraph(context, Formulae.main.clientWidth - this.level * 50 - 25, this.children.length);

		for (let p = 0, P = this.children.length; p < P; ++p) {
			this.paragraph.appendExpression(this.children[p]);
		}

		this.paragraph.postProcess(this);
	}

	display(context, x, y) {
		if (!this.isValid()) {
			this.displayAsFunction(context, x, y);
			return;
		}
		
		let l, L = this.paragraph.lines.length;
		let t, T;
		let line, token;

		for (l = 0; l < L; ++l) {
			line = this.paragraph.lines[l];
			T = line.tokens.length;
	
			for (t = 0; t < T; ++t) {
				token = line.tokens[t];

				if (token instanceof Typesetting.FormattingToken) {
					token.setFormat(context);
				}
				else if (token instanceof Typesetting.RestoringToken) {
					token.restoreFormat(context);
				}
				else {
					if (token.object instanceof Expression) {
						token.object.display(context, x + Math.floor(token.x), y + line.horzBaseline - token.object.horzBaseline);
						//token.object.display(context, x + token.object.x, y + token.object.y);
					}
					else {
						context.fillText(token.object, x + token.x, y + line.horzBaseline + Math.round(context.fontInfo.semiHeight));
					}
				}
			}
		}

		//console.log(this);
		this.paragraph.createRectangles(this, x, y);

		/*
		let rectangles, rectangle;
		for (let i = 0, n = this.children.length; i < n; ++i) {
			rectangles = this.children[i].rectangles;
			console.log(rectangles);

			for (let r = rectangles.minLine, R = rectangles.maxLine; r <= R; ++r) {
				rectangle = rectangles[r];
				context.strokeRect(rectangle.x - 0.5, rectangle.y - 0.5, rectangle.width + 1, rectangle.height + 1);
			}
		}
		*/
	}

    fromPointX(x, y, offsetX, offsetY) {
        // x -= offsetX;
        // y -= offsetY;

        //if (x < 0 || y < 0 || x > this.width || y > this.height) return null; // ???
        
		let rectangles, rectangle;
		let expression;
		let r, R;
		let test;

		for (let i = 0, n = this.children.length; i < n; ++i) {
			expression = this.children[i];
			rectangles = expression.rectangles;
			r = rectangles.minLine;
			R = rectangles.maxLine;

			for (;r <= R; ++r) {
				rectangle = rectangles[r];
				if (x >= rectangle.x && y >= rectangle.y && x <= rectangle.x + rectangle.width && y <= rectangle.y + rectangle.height) {
					switch (expression.getTag()) {
						//case "String.String":
						case "String.Text":
						case "Internet.UniformResourceLocator":
							return expression;

						default:
							if ((test = expression.fromPoint(x, y, expression.x, expression.y)) != null) return test;
					}

					return expression;
				}
			}
		}

		return this;

		/*
		let line, expression;
		let rectangles, r, R;

        for (let ch = 0, CH = this.paragraph.chunks.length; ch < CH; ++ch) {
			expression = this.paragraph.chunks[ch].expression;
			rectangles = expression.rectangles;
			
			for (let l = rectangles.minLine, L = rectangles.maxLine; l <= L; ++l) {
				if (x >= rectangles[l].x && y >= rectangles[l].y && x <= rectangles[l].x + rectangles[l].width && y <= rectangles[l].y + rectangles[l].height) {   // it is inside a rectangle
					return expression;
				}
			}
        }

        return null;
		*/
    }

	/*
	drawHighlightedChild(context, pos) {
		let chunk = this.paragraph.chunks[pos];
		let line, expression;
		let x1, x2, y1, h;

		for (let l = chunk.startLine, L = chunk.endLine; l <= L; ++l) {
			line = this.paragraph.lines[l];
			expression = chunk.expression;

			x1 = l == chunk.startLine ? chunk.startPos : 0;
			x2 = l == chunk.endLine ? chunk.endPos : line.width;

			if (expression.getTag() == "String.String") {
				y1 = line.horzBaseline - chunk.fontSize / 2;
				h = chunk.fontSize;
			}
			else {
				y1 = line.horzBaseline - expression.horzBaseline;
				h = expression.height;
			}

			context.strokeRect(Math.floor(x1) - 0.5, Math.floor(y1) - 0.5, Math.floor(x2 - x1) + 1, Math.floor(h) + 1);
		}
	}

	drawSelectedChild(context, pos) {
		let chunk = this.paragraph.chunks[pos];
		let line, expression;
		let x1, x2, y1, h;

		for (let l = chunk.startLine, L = chunk.endLine; l <= L; ++l) {
			line = this.paragraph.lines[l];
			expression = chunk.expression;

			x1 = l == chunk.startLine ? chunk.startPos : 0;
			x2 = l == chunk.endLine ? chunk.endPos : line.width;

			if (expression.getTag() == "String.String") {
				y1 = line.horzBaseline - chunk.fontSize / 2;
				h = chunk.fontSize;
			}
			else {
				y1 = line.horzBaseline - expression.horzBaseline;
				h = expression.height;
			}

			context.fillRect(Math.floor(x1), Math.floor(y1), Math.floor(x2 - x1), Math.floor(h));
		}
	}
	*/
};

Typesetting.BoldChunk = class extends Expression {
	constructor() {
		super();
		this.color = "red";
	}

	getTag() { return "Typesetting.BoldChunk"; }
	getName() { return Typesetting.messages["nameBoldChunk"]; }
	canHaveChildren(count) { return count >= 1; }
	getMnemonic() { return Typesetting.messages["mnemonicBoldChunk"]; }

	isChildAbsolutePositioning(i) {
		return true;
	}
	
	isChildShapedByChunks(i) {
		return this.isShapedByChunks();
	}
	
	/*
	isShapedByChunks() {
		if (this.parent == null) return false;
		if (this.parent instanceof ExpressionHandler) return false;
		switch (this.parent.getTag()) {
			case "Typesetting.Paragraph":
			case "Typesetting.BoldChunk":
			case "Typesetting.ItalicChunk":
			case "Typesetting.ColorChunk":
				return this.parent.isShapedByChunks();
			
			default:
				return false;
		}
	}
	*/
	
	prepareDisplay(context) { this.prepareDisplayAsFunction(context); }
	display(context, x, y) { this.displayAsFunction(context, x, y); }
};

Typesetting.ItalicChunk = class extends Expression {
	constructor() {
		super();
		this.color = "red";
	}
	
	getTag() { return "Typesetting.ItalicChunk"; }
	getName() { return Typesetting.messages["nameItalicChunk"]; }
	canHaveChildren(count) { return count >= 1; }
	getMnemonic() { return Typesetting.messages["mnemonicItalicChunk"]; }

	isChildAbsolutePositioning(i) {
		return true;
	}

	isChildShapedByChunks(i) {
		return this.isShapedByChunks();
	}
	
	prepareDisplay(context) { this.prepareDisplayAsFunction(context); }
	display(context, x, y) { this.displayAsFunction(context, x, y); }
};

Typesetting.ColorChunk = class extends Expression {
	constructor() {
		super();
		this.color = "red";
	}
	
	getTag() { return "Typesetting.ColorChunk"; }
	getName() { return Typesetting.messages["nameColorChunk"]; }
	canHaveChildren(count) { return count >= 1; }
	getMnemonic() { return Typesetting.messages["mnemonicColorChunk"]; }

	set(name, value) {
		switch (name) {
			case "Red"  : this.redValue   = value; return;
			case "Green": this.greenValue = value; return;
			case "Blue" : this.blueValue  = value; return;
			case "Alpha": this.alphaValue = value; return;
		}

		super.set(name, value);
	}
	
	get(name) {
		switch (name) {
			case "Red"  : return this.redValue;
			case "Green": return this.greenValue;
			case "Blue" : return this.blueValue;
			case "Alpha": return this.alphaValue;
		}

		super.get(name);
	}
	
	getSerializationNames() {
		return [ "Red", "Green", "Blue", "Alpha" ];
	}
	
	async getSerializationStrings() {
		return [ this.redValue.toString(), this.greenValue.toString(), this.blueValue.toString(), this.alphaValue.toString() ];
	}
	
	setSerializationStrings(strings, promises) {
		for (let i = 0; i < 4; ++i) {
			if (!/^(0|1|0\.\d+)$/.test(strings[i])) {
				throw "Invalid number: " + strings[i];
			}
		}
		
		this.set("Red",   parseFloat(strings[0]));
		this.set("Green", parseFloat(strings[1]));
		this.set("Blue",  parseFloat(strings[2]));
		this.set("Alpha", parseFloat(strings[3]));
	}
	
	isChildAbsolutePositioning(i) {
		return true;
	}

	isChildShapedByChunks(i) {
		return this.isShapedByChunks();
	}
	
	prepareDisplay(context) { this.prepareDisplayAsFunction(context); }
	display(context, x, y) { this.displayAsFunction(context, x, y); }
};

Typesetting.MultiParagraph = class extends Expression {
	constructor() {
		super();
		this.color = "red";
	}
	
	getTag() { return "Typesetting.MultiParagraph"; }
	getName() { return Typesetting.messages["nameMultiParagraph"]; }
	canHaveChildren(count) { return count >= 2; }
	getMnemonic() { return Typesetting.messages["mnemonicMultiParagraph"]; }
	
	//isChildAbsolutePositioning(i) {
	//	return true;
	//}
	
	isValid() {
		if (this.parent instanceof ExpressionHandler) return true;
		
		switch (this.parent.getTag()) {
			case "Typesetting.BulletedList":
				return true;
		}
		
		return false;
	}

	prepareDisplay(context) {
		if (!this.isValid()) {
			this.prepareDisplayAsFunction(context);
			return;
		}
		
		this.level = this.parent.level === undefined ? 0 : this.parent.level;

		let child;
		let maxWidth = 0;
		this.height = 0;

		for (let i = 0, n = this.children.length; i < n; ++i) {
			(child = this.children[i]).prepareDisplay(context);

			if (i == 0) {
				this.horzBaseline = child.horzBaseline;
			}
			else {
				this.height += 15;
			}

			child.x = 0;
			child.y = this.height;
			this.height += child.height;

			if (child.width > maxWidth) maxWidth = child.width;
		}

		this.width = maxWidth;
		this.vertBaseline = Math.round(this.width / 2);
	}

	display(context, x, y) {
		if (!this.isValid()) {
			this.displayAsFunction(context, x, y);
			return;
		}

		let child;
		for (let i = 0, n = this.children.length; i < n; ++i) {
			(child = this.children[i]);

			child.display(context, x + child.x, y + child.y);
		}
	}

	moveAcross(son, direction) {
		if (direction == Expression.UP) {
			if (son != 0) {
				return this.children[son - 1].moveTo(direction);
			}
		}
		else if (direction == Expression.DOWN) {
			if (son != this.children.length - 1) {
				return this.children[son + 1].moveTo(direction);
			}
		}
		
		return this.moveOut(direction);
	}
	
	moveTo(direction) {
		if (direction == Expression.UP) {
			return this.children[this.children.length - 1].moveTo(direction);
		}
		else {
			return this.children[0].moveTo(direction);
		}
	}
};

Typesetting.BulletedList = class extends Expression {
	getTag() { return "Typesetting.BulletedList"; }
	getName() { return Typesetting.messages["nameBulletedList"]; }
	canHaveChildren(count) { return count > 0; }

	prepareDisplay(context) {
		this.level = this.parent.level === undefined ? 1 : this.parent.level + 1;

		this.width = 0;
		this.height = 0;

		let child;
		for (let i = 0, n = this.children.length; i < n; ++i) {
			(child = this.children[i]).prepareDisplay(context);

			if (i > 0) this.height += 10;

			if (child.width > this.width) this.width = child.width;

			child.x = 50;
			child.y = this.height;

			this.height += child.height;
		}

		this.width += 50;
		this.vertBaseline = Math.round(this.width / 2);
		this.horzBaseline = this.children[0].horzBaseline;
	}

	display(context, x, y) {
		let child;
		for (let i = 0, n = this.children.length; i < n; ++i) {
			(child = this.children[i]);

			context.fillText("•", x + child.x - 25, y + child.y + child.horzBaseline + Math.round(Formulae.fontSize / 2));
			child.display(context, x + child.x, y + child.y);
		}
	}

	moveAcross(son, direction) {
		if (direction == Expression.UP) {
			if (son != 0) {
				return this.children[son - 1].moveTo(direction);
			}
		}
		else if (direction == Expression.DOWN) {
			if (son != this.children.length - 1) {
				return this.children[son + 1].moveTo(direction);
			}
		}
		
		return this.moveOut(direction);
	}
	
	moveTo(direction) {
		if (direction == Expression.UP) {
			return this.children[this.children.length - 1].moveTo(direction);
		}
		else {
			return this.children[0].moveTo(direction);
		}
	}
}

Typesetting.Centering = class extends Expression {
	getTag() { return "Typesetting.Centering"; }
	getName() { return Typesetting.messages["nameCentering"]; }
	canHaveChildren(count) { return count = 1; }

	prepareDisplay(context) {
		this.level = this.parent.level === undefined ? 0 : this.parent.level;
		let child = this.children[0];

		child.prepareDisplay(context);

		let offset = Math.round(((Formulae.main.clientWidth - this.level * 50 - 25) - child.width) / 2);
		if (offset < this.level * 50) offset = this.level * 50;

		child.x = offset;
		child.y = 0;

		this.width = offset + child.width;
		this.height = child.height;

		this.vertBaseline = offset + child.vertBaseline;
		this.horzBaseline = child.horzBaseline;
	}

	display(context, x, y) {
		let child = this.children[0];
		child.display(context, x + child.x, y + child.y);
	}
};

Typesetting.Rule = class extends Expression.NullaryExpression {
	getTag() { return "Typesetting.Rule"; }
	getName() { return Typesetting.messages["nameRule"]; }
	
	prepareDisplay(context) {
		this.level = this.parent.level === undefined ? 0 : this.parent.level;
		let offset = this.level * 50;
		
		this.width = Formulae.main.clientWidth - offset - 25;
		this.height = 1;
		this.vertBaseline = Math.round(this.width / 2);
		this.horzBaseline = 0;
	}
	
	display(context, x, y) {
		context.beginPath();
		context.moveTo (x + 0.5, y + 0.5); context.lineTo(x + this.width + 0.5, y + 0.5); // preventing obfuscation
		context.stroke();
	}
}

Typesetting.setExpressions = function(module) {
	Formulae.setExpression(module, "Typesetting.Paragraph",      Typesetting.ParagraphExpression);
	Formulae.setExpression(module, "Typesetting.BoldChunk",      Typesetting.BoldChunk);
	Formulae.setExpression(module, "Typesetting.ItalicChunk",    Typesetting.ItalicChunk);
	Formulae.setExpression(module, "Typesetting.ColorChunk",     Typesetting.ColorChunk);
	Formulae.setExpression(module, "Typesetting.MultiParagraph", Typesetting.MultiParagraph);
	Formulae.setExpression(module, "Typesetting.BulletedList",   Typesetting.BulletedList);
	Formulae.setExpression(module, "Typesetting.Centering",      Typesetting.Centering);
	Formulae.setExpression(module, "Typesetting.Rule",           Typesetting.Rule);

	Formulae.setExpression(module, "Typesetting.CreateParagraph", {
		clazz:        Expression.Function,
		getTag:       () => "Typesetting.CreateParagraph",
		getMnemonic:  () => this.messages["mnemonicCreateParagraph"],
		getName:      () => this.messages["nameCreateParagraph"],
		min: 1, max: 1
	});
};
