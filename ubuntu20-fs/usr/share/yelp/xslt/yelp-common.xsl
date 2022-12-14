<?xml version='1.0' encoding='UTF-8'?><!-- -*- indent-tabs-mode: nil -*- -->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:yelp="http://www.gnome.org/yelp/ns"
                xmlns:set="http://exslt.org/sets"
                xmlns:mml="http://www.w3.org/1998/Math/MathML"
                xmlns="http://www.w3.org/1999/xhtml"
                exclude-result-prefixes="yelp set mml"
                extension-element-prefixes="yelp"
                version="1.0">

<xsl:param name="yelp.editor_mode" select="false()"/>

<xsl:param name="html.extension" select="''"/>

<xsl:param name="html.syntax.highlight" select="true()"/>
<xsl:param name="html.js.root" select="'file:///usr/share/yelp-xsl/js/'"/>

<xsl:template name="html.js.mathjax">
  <xsl:param name="node" select="."/>
  <xsl:if test="$node//mml:*[1]">
    <script type="text/javascript">
      <xsl:attribute name="src">
        <xsl:text>file:///usr/share/yelp/mathjax/MathJax.js?config=yelp</xsl:text>
      </xsl:attribute>
    </script>
  </xsl:if>
</xsl:template>

<!-- == html.output == -->
<xsl:template name="html.output">
  <xsl:param name="node" select="."/>
  <xsl:param name="href">
    <xsl:choose>
      <xsl:when test="$node/@xml:id">
        <xsl:value-of select="$node/@xml:id"/>
      </xsl:when>
      <xsl:when test="$node/@id">
        <xsl:value-of select="$node/@id"/>
      </xsl:when>
      <xsl:when test="set:has-same-node($node, /*)">
        <xsl:value-of select="$html.basename"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="generate-id()"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:param>
  <yelp:document href="{$href}">
    <xsl:call-template name="html.page">
      <xsl:with-param name="node" select="$node"/>
    </xsl:call-template>
  </yelp:document>
  <xsl:apply-templates mode="html.output.after.mode" select="$node"/>
</xsl:template>

<!-- == html.css.custom == -->
<xsl:template name="html.css.custom">
  <xsl:param name="direction"/>
  <xsl:param name="left"/>
  <xsl:param name="right"/>
<xsl:text>
h1 {
  font-weight: normal;
  font-size: 2.4em;
}
div.title-heading h2, h2 {
  font-weight: normal;
  font-size: 2em;
}
div.links-heading a {
  font-weight: normal;
  font-size: 2em;
}
a.linkdiv span.title {
  font-weight: normal;
  font-size: 1.2em;
}
header {
  background-color: </xsl:text>
  <xsl:value-of select="$color.bg.gray"/><xsl:text>;
  border-bottom: solid 1px </xsl:text>
  <xsl:value-of select="$color.bg.dark"/><xsl:text>;
}
footer {
  background-color: </xsl:text>
  <xsl:value-of select="$color.bg.gray"/><xsl:text>;
  border-top: solid 1px </xsl:text>
  <xsl:value-of select="$color.bg.dark"/><xsl:text>;
}
footer footer { border-top: none; }
a.trail { color:  </xsl:text>
  <xsl:value-of select="$color.fg.dark"/><xsl:text>; }
a.trail:hover { text-decoration: none; color:  </xsl:text>
  <xsl:value-of select="$color.fg.blue"/><xsl:text>; }
</xsl:text>
</xsl:template>

<xsl:template name="html.css.custom.x">
  <xsl:param name="direction"/>
  <xsl:param name="left"/>
  <xsl:param name="right"/>
<xsl:text>
div.code {
  -webkit-box-shadow: 0px 0px 4px </xsl:text><xsl:value-of select="$color.gray_border"/><xsl:text>;
}
div.code:hover {
  -webkit-box-shadow: 0px 0px 4px </xsl:text><xsl:value-of select="$color.blue_border"/><xsl:text>;
}
div.synopsis div.code, div.synopsis div.code:hover { -webkit-box-shadow: none; }
</xsl:text>
<xsl:call-template name="yelp.css.custom"/>
</xsl:template>

<xsl:template name="yelp.css.custom"/>

</xsl:stylesheet>
